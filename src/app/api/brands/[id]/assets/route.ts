import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: brandId } = await params;

    const supabase = await createAdminClient();
    const { data: brand, error } = await supabase
      .from("brands")
      .select("products, product_images")
      .eq("id", brandId)
      .single();

    if (error || !brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const productImages = (brand.product_images ?? {}) as Record<string, string>;
    const products = (brand.products ?? []) as string[];

    const assets = products
      .filter((name) => productImages[name])
      .map((name) => ({ name, url: productImages[name] }));

    return NextResponse.json({ assets });
  } catch (err: any) {
    console.error("[brands/assets]", err);
    return NextResponse.json({ error: err.message ?? "Failed to load assets" }, { status: 500 });
  }
}
