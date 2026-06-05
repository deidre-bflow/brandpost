import { NextRequest, NextResponse } from "next/server";
import { scrapeBrandFromUrl } from "@/lib/scrape-brand";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    // Normalise URL — prepend https:// if missing
    const normalised = /^https?:\/\//i.test(url) ? url : `https://${url}`;

    const result = await scrapeBrandFromUrl(normalised);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[scrape-brand]", err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? "Website scan unavailable — fill in manually" },
      { status: 500 }
    );
  }
}
