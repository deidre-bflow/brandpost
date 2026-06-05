export interface ScrapedBrand {
  name:            string | null;
  description:     string | null;
  logo_url:        string | null;
  primary_color:   string | null;
  secondary_color: string | null;
  colors:          string[];
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function normaliseHex(raw: string): string | null {
  const hex6 = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (hex6) return `#${hex6[1].toUpperCase()}`;
  const hex3 = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [r, g, b] = hex3[1].split("").map(c => c + c);
    return `#${(r + g + b).toUpperCase()}`;
  }
  return null;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return { h, s, l };
}

function isBrandColor(hex: string): boolean {
  const { s, l } = hexToHsl(hex);
  // Skip: near-white (l > 0.92), near-black / very dark (l < 0.18), grey (s < 0.15)
  // Dark navy backgrounds like #142444 have l ≈ 0.17 and get excluded here
  if (l > 0.92 || l < 0.18 || s < 0.15) return false;
  return true;
}

/**
 * Extract brand colours from raw HTML.
 * Colours that appear without a Tailwind opacity modifier (e.g. /10, /20)
 * are weighted higher — they're used as solid fills, the real brand colour.
 */
function extractColorsFromHtml(html: string): string[] {
  const score: Record<string, number> = {};

  const add = (raw: string, weight: number) => {
    const hex = normaliseHex(raw);
    if (hex && isBrandColor(hex)) score[hex] = (score[hex] ?? 0) + weight;
  };

  // Hex colours — check if immediately followed by / (Tailwind opacity modifier)
  // Solid use → weight 2, tinted/opacity modifier → weight 0.25
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    const charAfter = html[m.index! + m[0].length];
    const isOpacity = charAfter === "/";
    add(m[0], isOpacity ? 0.25 : 2);
  }

  // rgb() / rgba() — always solid usage
  for (const m of html.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)[^)]*\)/g)) {
    const hex = `#${[m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    add(hex, 1);
  }

  return Object.entries(score)
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

// ── Logo helpers ──────────────────────────────────────────────────────────────

/**
 * Find the logo URL from raw HTML.
 * Priority:
 *  1. <img> whose alt contains "logo"
 *  2. <img> whose src path contains "logo"
 *  3. <link rel="apple-touch-icon"> or <link rel="icon"> with an image href
 *  4. og:image meta tag (already extracted in metadata)
 */
function extractLogoFromHtml(html: string, baseUrl: string): string | null {
  const toAbsolute = (src: string): string => {
    if (/^https?:\/\//i.test(src)) return src;
    try { return new URL(src, baseUrl).href; } catch { return src; }
  };

  // 1 + 2: <img> tags
  for (const m of html.matchAll(/<img\b([^>]*?)>/gi)) {
    const tag  = m[1];
    const src  = tag.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const alt  = tag.match(/\balt=["']([^"']*)["']/i)?.[1] ?? "";
    if (!src) continue;
    // Skip tiny icons, spacers, data URIs, and watermark/decorative images
    if (/data:/i.test(src))                          continue;
    if (/watermark|spacer|pixel|blank/i.test(src))   continue;
    if (/aria-hidden=["']true["']/i.test(tag))       continue;
    if (/logo/i.test(alt) || /logo/i.test(src))      return toAbsolute(src);
  }

  // 3: <link rel="apple-touch-icon"> (high-res favicon often used as logo)
  const touchIcon = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i)
                 ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  if (touchIcon) return toAbsolute(touchIcon[1]);

  return null;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["html", "extract"],
      extract: {
        prompt: "Extract: 1) brandName — the company or brand name. 2) description — one sentence describing what the company does. Return null for any field you cannot confidently identify.",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Firecrawl API error ${res.status}: ${err}`);
  }

  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Firecrawl scrape failed");

  const data     = json.data ?? {};
  const extract  = data.extract  ?? {};
  const metadata = data.metadata ?? {};
  const html     = data.html     ?? "";

  // Colours from real CSS in the HTML
  const brandColors     = extractColorsFromHtml(html);
  const primary_color   = brandColors[0] ?? null;
  const secondary_color = brandColors[1] ?? null;

  // Logo from HTML parsing → og:image fallback
  const logo_url = extractLogoFromHtml(html, url)
                ?? metadata.ogImage
                ?? null;

  const name        = extract.brandName   ?? metadata.ogSiteName ?? metadata.title ?? null;
  const description = extract.description ?? metadata.description ?? null;

  return {
    name,
    description,
    logo_url,
    primary_color,
    secondary_color,
    colors: [primary_color, secondary_color].filter(Boolean) as string[],
  };
}
