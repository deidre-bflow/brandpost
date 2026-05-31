import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { generatePlatformContent } from "@/lib/anthropic";
import type { Brand, Platform } from "@/lib/types";
import { addDays, format } from "date-fns";

export const maxDuration = 60;
export const preferredRegion = "iad1";

// Day offsets within a week for each posts-per-week setting
const WEEK_OFFSETS: Record<number, number[]> = {
  2: [0, 3],       // Mon, Thu
  4: [0, 1, 3, 4], // Mon, Tue, Thu, Fri
};

function postToDayOffset(postNumber: number, postsPerWeek: number): number {
  const offsets = WEEK_OFFSETS[postsPerWeek] ?? WEEK_OFFSETS[4];
  const idx        = postNumber - 1;
  const week       = Math.floor(idx / postsPerWeek);
  const dayInWeek  = idx % postsPerWeek;
  return week * 7 + offsets[dayInWeek];
}

export async function POST(req: NextRequest) {
  try {
    const { brandId, platform, startDate, postsPerWeek = 4, weeks = 4 } = await req.json() as {
      brandId: string;
      platform: Platform;
      startDate: string;
      postsPerWeek?: number;
      weeks?: number;
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

    const totalPosts = (postsPerWeek ?? 4) * (weeks ?? 4);
    const posts = await generatePlatformContent(brand as Brand, platform, totalPosts);

    const batchId  = `${brandId}-${Date.now()}`;
    const baseDate = new Date(startDate);

    const rows = posts.map((p) => ({
      brand_id:         brandId,
      platform:         p.platform,
      content:          p.content,
      image_prompt:     p.image_prompt,
      scheduled_for:    format(
        addDays(baseDate, postToDayOffset(p.postNumber, postsPerWeek ?? 4)),
        "yyyy-MM-dd'T'10:00:00"
      ),
      status:           "draft",
      generation_batch: batchId,
    }));

    const { error: insertErr } = await supabase.from("posts").insert(rows);
    if (insertErr) throw new Error(insertErr.message);

    return NextResponse.json({ success: true, count: rows.length, batchId });
  } catch (err: any) {
    const msg = err?.message ?? err?.error?.message ?? JSON.stringify(err) ?? "Unknown error";
    console.error("[generate]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
