import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** GET /api/connections?brandId=xxx — list connections for a brand */
export async function GET(req: NextRequest) {
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brandId = req.nextUrl.searchParams.get("brandId");
  if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

  const { data } = await supabase
    .from("social_connections")
    .select("id, platform, account_name, account_id, token_expires_at, updated_at")
    .eq("brand_id", brandId);

  return NextResponse.json(data ?? []);
}

/** DELETE /api/connections?brandId=xxx&platform=xxx — disconnect a platform */
export async function DELETE(req: NextRequest) {
  const supabase  = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const brandId  = req.nextUrl.searchParams.get("brandId");
  const platform = req.nextUrl.searchParams.get("platform");
  if (!brandId || !platform) {
    return NextResponse.json({ error: "brandId and platform required" }, { status: 400 });
  }

  // Admin client to bypass RLS for delete
  const admin = await createAdminClient();
  await admin
    .from("social_connections")
    .delete()
    .eq("brand_id", brandId)
    .eq("platform", platform);

  return NextResponse.json({ ok: true });
}
