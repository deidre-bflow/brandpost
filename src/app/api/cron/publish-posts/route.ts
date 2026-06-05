import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import {
  publishToFacebook,
  publishToInstagram,
  publishToLinkedIn,
} from "@/lib/publishers";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  // Vercel injects CRON_SECRET automatically; verify it to block external callers
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createAdminClient();
  const now      = new Date().toISOString();

  // Find all approved posts that are due
  const { data: posts, error: postsErr } = await supabase
    .from("posts")
    .select("id, brand_id, platform, content, image_url, video_url")
    .eq("status", "approved")
    .lte("scheduled_for", now)
    .limit(50);

  if (postsErr) {
    console.error("[cron] posts query failed:", postsErr);
    return NextResponse.json({ error: postsErr.message }, { status: 500 });
  }
  if (!posts?.length) {
    return NextResponse.json({ published: 0 });
  }

  let published = 0;
  let failed    = 0;

  for (const post of posts) {
    // Fetch the matching social connection
    const { data: conn } = await supabase
      .from("social_connections")
      .select("access_token, account_id")
      .eq("brand_id", post.brand_id)
      .eq("platform", post.platform)
      .single();

    if (!conn) {
      console.warn(`[cron] No connection for post ${post.id} (${post.platform})`);
      await supabase.from("posts").update({
        status:        "failed",
        publish_error: `No ${post.platform} account connected for this brand`,
        published_at:  now,
      }).eq("id", post.id);
      failed++;
      continue;
    }

    try {
      let postUrl = "";

      if (post.platform === "facebook") {
        postUrl = await publishToFacebook({
          pageId:      conn.account_id,
          accessToken: conn.access_token,
          content:     post.content,
          imageUrl:    post.image_url,
        });
      } else if (post.platform === "instagram") {
        postUrl = await publishToInstagram({
          igUserId:    conn.account_id,
          accessToken: conn.access_token,
          content:     post.content,
          imageUrl:    post.image_url,
        });
      } else if (post.platform === "linkedin") {
        postUrl = await publishToLinkedIn({
          accessToken: conn.access_token,
          authorUrn:   conn.account_id,
          content:     post.content,
          imageUrl:    post.image_url,
        });
      }

      await supabase.from("posts").update({
        status:        "posted",
        post_url:      postUrl,
        published_at:  now,
        publish_error: null,
      }).eq("id", post.id);

      console.log(`[cron] ✓ Published post ${post.id} → ${postUrl}`);
      published++;
    } catch (err: any) {
      const msg = err?.message ?? String(err);
      console.error(`[cron] ✗ Post ${post.id} failed:`, msg);
      await supabase.from("posts").update({
        status:        "failed",
        publish_error: msg,
        published_at:  now,
      }).eq("id", post.id);
      failed++;
    }
  }

  return NextResponse.json({ published, failed });
}
