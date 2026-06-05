import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/review/[token] — public: fetch brand + posts for a review link */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createAdminClient();

    // Resolve token → brand
    const { data: link } = await supabase
      .from("review_links")
      .select("brand_id, label, expires_at, post_ids")
      .eq("token", token)
      .single();

    if (!link) return NextResponse.json({ error: "Review link not found" }, { status: 404 });

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "This review link has expired" }, { status: 410 });
    }

    // Fetch brand details
    const { data: brand } = await supabase
      .from("brands")
      .select("id, name, logo_url, primary_color")
      .eq("id", link.brand_id)
      .single();

    // Fetch posts — filtered to specific IDs if this is a re-share link
    let postsQuery = supabase
      .from("posts")
      .select("id, platform, content, image_url, video_url, scheduled_for, status, client_comment, client_approved, client_approved_at, client_name, client_position")
      .eq("brand_id", link.brand_id)
      .order("scheduled_for", { ascending: true });

    if (link.post_ids?.length) {
      postsQuery = postsQuery.in("id", link.post_ids);
    } else {
      postsQuery = postsQuery.in("status", ["draft", "approved"]);
    }

    const { data: posts } = await postsQuery;

    return NextResponse.json({ brand, posts: posts ?? [], label: link.label });
  } catch (err: any) {
    console.error("[review/token]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
