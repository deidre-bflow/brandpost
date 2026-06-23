import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import crypto from "crypto";

const FB = "https://graph.facebook.com/v21.0";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  if (searchParams.get("error") || !code || !state) {
    return NextResponse.redirect(`${appUrl}/connections?error=facebook_denied`);
  }

  const [brandId, nonce] = state.split(":");
  if (!nonce || nonce !== req.cookies.get("fb_oauth_nonce")?.value) {
    return NextResponse.redirect(`${appUrl}/connections?error=facebook_csrf`);
  }

  try {
    // Short-lived user token
    const t1Params = new URLSearchParams({
      client_id:     process.env.FACEBOOK_APP_ID!,
      client_secret: process.env.FACEBOOK_APP_SECRET!,
      redirect_uri:  `${appUrl}/api/auth/facebook/callback`,
      code,
    });
    const t1Data = await fetch(`${FB}/oauth/access_token?${t1Params}`).then(r => r.json());
    if (!t1Data.access_token) throw new Error("No token from Facebook");

    // Long-lived user token (60 days)
    const t2Params = new URLSearchParams({
      grant_type:        "fb_exchange_token",
      client_id:         process.env.FACEBOOK_APP_ID!,
      client_secret:     process.env.FACEBOOK_APP_SECRET!,
      fb_exchange_token: t1Data.access_token,
    });
    const t2Data    = await fetch(`${FB}/oauth/access_token?${t2Params}`).then(r => r.json());
    const userToken = t2Data.access_token ?? t1Data.access_token;

    // Pages directly on the user's personal profile
    const pagesData = await fetch(
      `${FB}/me/accounts?fields=id,name,access_token,instagram_business_account{id,name}&limit=100&access_token=${userToken}`
    ).then(r => r.json());

    const pages: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; name: string };
    }> = pagesData.data ?? [];

    // Also fetch pages from Business Manager portfolios
    try {
      const bizData = await fetch(
        `${FB}/me/businesses?fields=id,name&limit=100&access_token=${userToken}`
      ).then(r => r.json());

      const businesses: Array<{ id: string; name: string }> = bizData.data ?? [];

      for (const biz of businesses) {
        const bizPages = await fetch(
          `${FB}/${biz.id}/owned_pages?fields=id,name,access_token,instagram_business_account{id,name}&limit=100&access_token=${userToken}`
        ).then(r => r.json());

        for (const p of (bizPages.data ?? [])) {
          if (!pages.find(existing => existing.id === p.id)) {
            pages.push(p);
          }
        }

        // Also check client pages (pages shared with the business)
        const clientPages = await fetch(
          `${FB}/${biz.id}/client_pages?fields=id,name,access_token,instagram_business_account{id,name}&limit=100&access_token=${userToken}`
        ).then(r => r.json());

        for (const p of (clientPages.data ?? [])) {
          if (!pages.find(existing => existing.id === p.id)) {
            pages.push(p);
          }
        }
      }
    } catch (bizErr) {
      console.warn("[fb-callback] business pages fetch failed:", bizErr);
    }

    if (pages.length === 0) {
      return NextResponse.redirect(`${appUrl}/connections?error=no_pages&brandId=${brandId}`);
    }

    // Store pending data for the page-selection step
    const supabase = await createAdminClient();
    const key = crypto.randomBytes(20).toString("hex");
    await supabase.from("pending_oauth").insert({
      key,
      brand_id: brandId,
      platform: "facebook",
      data: { pages },
    });

    const res = NextResponse.redirect(
      `${appUrl}/connections?pending=${key}&brandId=${brandId}`
    );
    res.cookies.delete("fb_oauth_nonce");
    return res;
  } catch (err: any) {
    console.error("[fb-callback]", err);
    return NextResponse.redirect(`${appUrl}/connections?error=facebook_failed`);
  }
}
