import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePlatformBatch } from "@/lib/anthropic";
import type { Brand, Platform } from "@/lib/types";
import { addDays, format } from "date-fns";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { brandId, platform, startDate, startDay, count } = await req.json() as {
      brandId: string;
      platform: Platform;
      startDate: string;
      startDay: number;   // e.g. 1, 11, 21
      count: number;      // e.g. 10
    };

    if (!brandId || !platform) {
      return NextResponse.json({ error: "brandId and platform required" }, { status: 400 });
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

    const posts = await generatePlatformBatch(brand as Brand, platform, startDay ?? 1, count ?? 10);

    const batchId = `${brandId}-${Date.now()}`;
    const baseDate = new Date(startDate);

    const rows = posts.map((p) => ({
      brand_id:         brandId,
      platform:         p.platform,
      content:          p.content,
      image_prompt:     p.image_prompt,
      scheduled_for:    format(addDays(baseDate, p.day - 1), "yyyy-MM-dd'T'10:00:00"),
      status:           "draft",
      generation_batch: batchId,
    }));

    const { error: insertErr } = await supabase.from("posts").insert(rows);
    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({ success: true, count: rows.length, batchId });
  } catch (err: any) {
    console.error("[generate]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
