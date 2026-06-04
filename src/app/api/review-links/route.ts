import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/** POST /api/review-links — create a shareable review link for a brand */
export async function POST(req: NextRequest) {
  try {
    // Verify the caller is authenticated and owns this brand
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { brandId, label } = await req.json();
    if (!brandId) return NextResponse.json({ error: "brandId required" }, { status: 400 });

    const { data: brand } = await userSupabase
      .from("brands")
      .select("id")
      .eq("id", brandId)
      .eq("user_id", user.id)
      .single();

    if (!brand) return NextResponse.json({ error: "Brand not found" }, { status: 404 });

    // Create the review link (admin client bypasses RLS insert)
    const admin = await createAdminClient();
    const { data: link, error } = await admin
      .from("review_links")
      .insert({ brand_id: brandId, label: label ?? null })
      .select("token")
      .single();

    if (error || !link) {
      return NextResponse.json({ error: error?.message ?? "Failed to create link" }, { status: 500 });
    }

    return NextResponse.json({ token: link.token });
  } catch (err: any) {
    console.error("[review-links]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
