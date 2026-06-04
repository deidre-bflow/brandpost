import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** PATCH /api/review/[token]/posts/[postId] — public: save client comment + approval */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ token: string; postId: string }> }
) {
  try {
    const { token, postId } = await params;
    const supabase = await createAdminClient();

    // Verify the token resolves to the post's brand
    const { data: link } = await supabase
      .from("review_links")
      .select("brand_id, expires_at")
      .eq("token", token)
      .single();

    if (!link) return NextResponse.json({ error: "Invalid review link" }, { status: 404 });
    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      return NextResponse.json({ error: "Review link has expired" }, { status: 410 });
    }

    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .eq("brand_id", link.brand_id)
      .single();

    if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });

    const body = await req.json();
    const update: Record<string, unknown> = {};

    if (typeof body.comment === "string") {
      update.client_comment = body.comment || null;
    }
    if (typeof body.approved === "boolean") {
      update.client_approved    = body.approved;
      update.client_approved_at = body.approved ? new Date().toISOString() : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    await supabase.from("posts").update(update).eq("id", postId);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[review/token/posts/postId]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
