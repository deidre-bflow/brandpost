import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

/** GET /api/auth/facebook/pending?key=xxx — return pending page list */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

  const supabase = await createAdminClient();
  const { data } = await supabase
    .from("pending_oauth")
    .select("data, expires_at, brand_id")
    .eq("key", key)
    .eq("platform", "facebook")
    .single();

  if (!data) return NextResponse.json({ error: "Expired or invalid key" }, { status: 404 });
  if (new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ error: "Session expired — please try again" }, { status: 410 });
  }

  return NextResponse.json({ pages: data.data.pages, brandId: data.brand_id });
}
