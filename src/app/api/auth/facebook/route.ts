import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import crypto from "crypto";

/** GET /api/auth/facebook?brandId=xxx  — kick off Facebook OAuth */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  const nonce = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id:     process.env.FACEBOOK_APP_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/facebook/callback`,
    scope:         "pages_manage_posts,pages_read_engagement,pages_show_list,instagram_basic,instagram_content_publish",
    state:         `${brandId}:${nonce}`,
    response_type: "code",
  });

  const res = NextResponse.redirect(
    `https://www.facebook.com/v21.0/dialog/oauth?${params}`
  );
  res.cookies.set("fb_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
