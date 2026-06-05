import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (searchParams.get("error") || !code || !state) {
    return NextResponse.redirect(`${appUrl}/connections?error=linkedin_denied`);
  }

  const [brandId, nonce] = state.split(":");
  if (!nonce || nonce !== req.cookies.get("li_oauth_nonce")?.value) {
    return NextResponse.redirect(`${appUrl}/connections?error=linkedin_csrf`);
  }

  try {
    // Exchange code for token
    const tokenBody = new URLSearchParams({
      grant_type:    "authorization_code",
      code,
      redirect_uri:  `${appUrl}/api/auth/linkedin/callback`,
      client_id:     process.env.LINKEDIN_CLIENT_ID!,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
    });
    const tokenData = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody,
    }).then(r => r.json());

    if (!tokenData.access_token) throw new Error("No LinkedIn access token");

    // Get user identity (OpenID Connect)
    const profile = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    }).then(r => r.json());

    const personUrn  = `urn:li:person:${profile.sub}`;
    const name       = profile.name ?? profile.given_name ?? "LinkedIn Account";
    const expiresAt  = tokenData.expires_in
      ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
      : null;

    const supabase = await createAdminClient();
    await supabase.from("social_connections").upsert({
      brand_id:         brandId,
      platform:         "linkedin",
      access_token:     tokenData.access_token,
      account_id:       personUrn,
      account_name:     name,
      token_expires_at: expiresAt,
      updated_at:       new Date().toISOString(),
    }, { onConflict: "brand_id,platform" });

    const res = NextResponse.redirect(
      `${appUrl}/connections?success=linkedin&brandId=${brandId}`
    );
    res.cookies.delete("li_oauth_nonce");
    return res;
  } catch (err: any) {
    console.error("[li-callback]", err);
    return NextResponse.redirect(`${appUrl}/connections?error=linkedin_failed`);
  }
}
