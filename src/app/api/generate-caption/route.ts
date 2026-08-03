import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generateSinglePost } from "@/lib/anthropic";
import type { Brand, Platform } from "@/lib/types";

export const maxDuration = 60;
export const preferredRegion = "iad1";

export async function POST(req: NextRequest) {
  try {
    const { brandId, platform, imagePrompt } = await req.json() as {
      brandId: string;
      platform: Platform;
      imagePrompt: string;
      referenceUrl?: string | null;
    };

    if (!brandId || !platform || !imagePrompt) {
      return NextResponse.json({ error: "brandId, platform and imagePrompt required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: brand, error: brandErr } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();
    if (brandErr || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const result = await generateSinglePost(brand as Brand, platform, imagePrompt);

    return NextResponse.json(result);
  } catch (err: any) {
    const msg = err?.message ?? err?.error?.message ?? JSON.stringify(err) ?? "Unknown error";
    console.error("[generate-caption]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
