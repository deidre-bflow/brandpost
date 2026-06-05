import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** POST /api/auth/facebook/connect — save the chosen Facebook Page (and Instagram if linked) */
export async function POST(req: NextRequest) {
  try {
    const { key, pageId } = await req.json();
    if (!key || !pageId) {
      return NextResponse.json({ error: "key and pageId required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    const { data: pending } = await supabase
      .from("pending_oauth")
      .select("brand_id, data, expires_at")
      .eq("key", key)
      .eq("platform", "facebook")
      .single();

    if (!pending) return NextResponse.json({ error: "Invalid or expired key" }, { status: 404 });
    if (new Date(pending.expires_at) < new Date()) {
      return NextResponse.json({ error: "Session expired — please reconnect" }, { status: 410 });
    }

    const pages: Array<{
      id: string;
      name: string;
      access_token: string;
      instagram_business_account?: { id: string; name: string };
    }> = pending.data.pages;

    const page = pages.find(p => p.id === pageId);
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });

    const brandId = pending.brand_id;
    const now = new Date().toISOString();

    // Save Facebook connection
    await supabase.from("social_connections").upsert({
      brand_id:     brandId,
      platform:     "facebook",
      access_token: page.access_token,
      account_id:   page.id,
      account_name: page.name,
      updated_at:   now,
    }, { onConflict: "brand_id,platform" });

    // Auto-save Instagram if this page has a linked IG Business Account
    if (page.instagram_business_account) {
      const ig = page.instagram_business_account;
      await supabase.from("social_connections").upsert({
        brand_id:     brandId,
        platform:     "instagram",
        access_token: page.access_token, // same page token works for IG Graph API
        account_id:   ig.id,
        account_name: ig.name,
        updated_at:   now,
      }, { onConflict: "brand_id,platform" });
    }

    // Clean up pending record
    await supabase.from("pending_oauth").delete().eq("key", key);

    return NextResponse.json({
      ok: true,
      instagram: !!page.instagram_business_account,
    });
  } catch (err: any) {
    console.error("[fb-connect]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
