import { NextRequest, NextResponse } from "next/server";
import { scrapeBrandFromUrl } from "@/lib/scrape-brand";

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
    const result = await scrapeBrandFromUrl(url);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[scrape-brand]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
