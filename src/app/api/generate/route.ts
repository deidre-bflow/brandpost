import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePlatformContent, WEEKLY_DAY_OFFSETS } from "@/lib/anthropic";
import type { Brand, Platform } from "@/lib/types";
import { addDays, format } from "date-fns";

export const maxDuration = 60;

/** Maps postNumber (1-16) to a day offset from startDate.
 *  4 posts per week on Mon/Tue/Thu/Fri: offsets [0,1,3,4], [7,8,10,11], [14,15,17,18], [21,22,24,25]
 */
function postToDayOffset(postNumber: number): number {
  const idx = postNumber - 1;          // 0-based
  const week = Math.floor(idx / 4);    // 0-3
  const dayInWeek = idx % 4;           // 0-3
  return week * 7 + WEEKLY_DAY_OFFSETS[dayInWeek];
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, platform, startDate } = await req.json() as {
      brandId: string;
      platform: Platform;
      startDate: string;
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

    const posts = await generatePlatformContent(brand as Brand, platform);

    const batchId = `${brandId}-${Date.now()}`;
    const baseDate = new Date(startDate);

    const rows = posts.map((p) => ({
      brand_id:         brandId,
      platform:         p.platform,
      content:          p.content,
      image_prompt:     p.image_prompt,
      scheduled_for:    format(addDays(baseDate, postToDayOffset(p.postNumber)), "yyyy-MM-dd'T'10:00:00"),
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
