export interface ScrapedBrand {
  name:            string | null;
  description:     string | null;
  logo_url:        string | null;
  primary_color:   string | null;
  secondary_color: string | null;
  colors:          string[];
}

export async function scrapeBrandFromUrl(url: string): Promise<ScrapedBrand> {
  const apiKey = process.env.FIRECRAWL_API_KEY;
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY is not configured");

  // Use Firecrawl REST API directly (v1) — avoids SDK version/shape issues
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown", "extract"],
      extract: {
        prompt: `Extract brand information from this website:
1. brandName — the company or brand name
2. logoUrl — direct https:// URL to the company logo image (look for <img> with "logo" in src or alt, og:image meta tag)
3. primaryColor — the dominant brand colour as a hex code e.g. #F5A623 (look at hero backgrounds, CTA buttons, headers)
4. secondaryColor — a secondary brand colour as hex if clearly present
5. description — one sentence describing what the company does
Return null for any field you cannot confidently identify.`,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => res.statusText);
    throw new Error(`Firecrawl API error ${res.status}: ${err}`);
  }

  const json = await res.json();

  if (!json.success) {
    throw new Error(json.error ?? "Firecrawl scrape failed");
  }

  // API returns: { success: true, data: { markdown, metadata, extract } }
  const data     = json.data ?? {};
  const extract  = data.extract  ?? {};
  const metadata = data.metadata ?? {};

  const cleanHex = (c: string | null | undefined): string | null => {
    if (!c) return null;
    const m = c.match(/#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/);
    return m ? `#${m[1].toUpperCase()}` : null;
  };

  const name            = extract.brandName       ?? metadata.ogSiteName ?? metadata.title ?? null;
  const logo_url        = extract.logoUrl         ?? metadata.ogImage    ?? null;
  const primary_color   = cleanHex(extract.primaryColor);
  const secondary_color = cleanHex(extract.secondaryColor);
  const description     = extract.description     ?? metadata.description ?? null;

  return {
    name,
    description,
    logo_url,
    primary_color,
    secondary_color,
    colors: [primary_color, secondary_color].filter(Boolean) as string[],
  };
}
