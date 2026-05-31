import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generate30DayContent } from "@/lib/anthropic";
import type { Brand, Platform } from "@/lib/types";
import { addDays, format } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const { brandId, platforms, startDate } = await req.json() as {
      brandId: string;
      platforms: Platform[];
      startDate: string; // ISO date string
    };

    if (!brandId || !platforms?.length) {
      return NextResponse.json({ error: "brandId and platforms required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch brand
    const { data: brand, error: brandErr } = await supabase
      .from("brands")
      .select("*")
      .eq("id", brandId)
      .single();
    if (brandErr || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Generate content with Claude
    const posts = await generate30DayContent(brand as Brand, platforms);

    // Batch ID to group this generation
    const batchId = `${brandId}-${Date.now()}`;
    const baseDate = new Date(startDate);

    // Build rows to insert
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
