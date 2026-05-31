export interface ScrapedBrand {
  name: string | null;
  description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  colors: string[];
}

export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (BrandFlow brand-kit scraper)" },
    signal: AbortSignal.timeout(8000),
  });
  const html = await res.text();

  // ── Extract with regex (no cheerio on edge runtime) ──────────────

  // Site name from og:site_name or title
  const siteName =
    (html.match(/<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i) ||
     html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i))?.[1] ??
    html.match(/<title[^>]*>([^<]{1,80})<\/title>/i)?.[1]?.split(/[|\-–]/)[0]?.trim() ??
    null;

  // Description
  const description =
    (html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']{1,300})["']/i) ||
     html.match(/<meta[^>]+content=["']([^"']{1,300})["'][^>]+property=["']og:description["']/i) ||
     html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,300})["']/i))?.[1] ??
    null;

  // Logo from og:image or apple-touch-icon or favicon
  const logoRaw =
    (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
     html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i))?.[1] ??
    html.match(/<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/i)?.[1] ??
    html.match(/<link[^>]+href=["']([^"']+\.(?:png|svg|ico))["'][^>]+rel=["'][^"']*icon[^"']*["']/i)?.[1] ??
    null;

  // Resolve relative URLs
  const base = new URL(url);
  const logo_url = logoRaw
    ? (logoRaw.startsWith("http") ? logoRaw : new URL(logoRaw, base).href)
    : null;

  // Extract hex colors from inline CSS / style tags
  const hexMatches = html.match(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g) ?? [];
  // Dedupe and filter near-black/near-white
  const colorCounts: Record<string, number> = {};
  for (const c of hexMatches) {
    const norm = c.toLowerCase();
    colorCounts[norm] = (colorCounts[norm] ?? 0) + 1;
  }
  const colors = Object.entries(colorCounts)
    .filter(([c]) => {
      // Expand 3-digit hex
      const full = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
      const r = parseInt(full.slice(1, 3), 16);
      const g = parseInt(full.slice(3, 5), 16);
      const b = parseInt(full.slice(5, 7), 16);
      // Skip very light (>220) or very dark (<20) on all channels
      const tooLight = r > 220 && g > 220 && b > 220;
      const tooDark  = r < 20  && g < 20  && b < 20;
      return !tooLight && !tooDark;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([c]) => c);

  return {
    name: siteName,
    description,
    logo_url,
    primary_color: colors[0] ?? null,
    colors,
  };
}
