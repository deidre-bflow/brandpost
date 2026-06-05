export interface ScrapedBrand {
  name:            string | null;
  description:     string | null;
  logo_url:        string | null;
  primary_color:   string | null;
  secondary_color: string | null;
  colors:          string[];
}

// ── Colour helpers ────────────────────────────────────────────────────────────

/** Normalise any CSS colour value to #RRGGBB or null */
function normaliseColor(raw: string): string | null {
  raw = raw.trim();

  // #RGB or #RRGGBB
  const hex6 = raw.match(/^#([0-9a-fA-F]{6})$/);
  if (hex6) return `#${hex6[1].toUpperCase()}`;

  const hex3 = raw.match(/^#([0-9a-fA-F]{3})$/);
  if (hex3) {
    const [r, g, b] = hex3[1].split("").map(c => c + c);
    return `#${(r + g + b).toUpperCase()}`;
  }

  // rgb(r, g, b)
  const rgb = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) {
    const hex = [rgb[1], rgb[2], rgb[3]]
      .map(n => parseInt(n).toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    return `#${hex}`;
  }

  return null;
}

/** Is this colour too close to white, black, or a neutral grey to be a brand colour? */
function isNeutral(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const lightness = (max + min) / 2 / 255;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1)) / 255;
  // Skip near-white (lightness > 0.92), near-black (lightness < 0.08), near-grey (saturation < 0.1)
  return lightness > 0.92 || lightness < 0.08 || saturation < 0.1;
}

/**
 * Pull every colour mentioned in <style> blocks and inline style="" attributes.
 * Returns colours ranked by frequency, neutrals removed.
 */
function extractColorsFromHtml(html: string): string[] {
  const freq: Record<string, number> = {};

  const addColor = (raw: string) => {
    const hex = normaliseColor(raw);
    if (hex && !isNeutral(hex)) freq[hex] = (freq[hex] ?? 0) + 1;
  };

  // All hex colours anywhere in the document
  for (const m of html.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g)) {
    addColor(m[0]);
  }

  // rgb()/rgba() values
  for (const m of html.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+[^)]*\)/g)) {
    addColor(m[0]);
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  // Fetch markdown + html + LLM extract in one call
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "html", "extract"],
      extract: {
        prompt: `Extract brand information from this website:
1. brandName — the company or brand name
2. logoUrl — the direct https:// URL to the company logo image (look for <img> tags where src or alt contains "logo", or the og:image meta tag)
3. description — one sentence describing what the company does
Return null for any field you cannot confidently identify. Do NOT guess colours — colours will be extracted from CSS separately.`,
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

  // ── Extract real brand colours from the page HTML/CSS ──
  const brandColors    = extractColorsFromHtml(html);
  const primary_color  = brandColors[0] ?? null;
  const secondary_color = brandColors[1] ?? null;

  // ── Best logo URL ──
  // Try: LLM result → og:image → favicon (last resort, skip)
  const logo_url = extract.logoUrl ?? metadata.ogImage ?? null;

  const name        = extract.brandName  ?? metadata.ogSiteName ?? metadata.title ?? null;
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
