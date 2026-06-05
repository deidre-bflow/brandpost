import { NextRequest, NextResponse } from "next/server";
import { generateImage, remixImage } from "@/lib/ideogram";
import { generateImageWithHighgsfield } from "@/lib/higgsfield";
import { createAdminClient } from "@/lib/supabase/server";
import sharp from "sharp";

export const maxDuration = 60;
export const preferredRegion = "iad1";

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

/** Overlay brand logo top-left with a white rounded badge */
async function overlayLogo(imageBuffer: Buffer, logoUrl: string): Promise<Buffer> {
  const logoBuffer = await fetchBuffer(logoUrl);
  if (!logoBuffer) return imageBuffer;
  try {
    const resized = await sharp(logoBuffer)
      .resize(140, 70, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    const { width: lw = 120, height: lh = 60 } = await sharp(resized).metadata();
    const PAD = 10;
    const bw = lw + PAD * 2;
    const bh = lh + PAD * 2;
    const badgeSvg = Buffer.from(
      `<svg width="${bw}" height="${bh}" xmlns="http://www.w3.org/2000/svg">
         <rect width="${bw}" height="${bh}" rx="10" fill="white" fill-opacity="0.93"/>
       </svg>`
    );
    const badge = await sharp({
      create: { width: bw, height: bh, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: badgeSvg, blend: "over" },
        { input: resized, top: PAD, left: PAD, blend: "over" },
      ])
      .png()
      .toBuffer();
    return await sharp(imageBuffer)
      .composite([{ input: badge, top: 18, left: 18, blend: "over" }])
      .jpeg({ quality: 92 })
      .toBuffer();
  } catch (e) {
    console.error("[logo-overlay] failed:", e);
    return imageBuffer;
  }
}

/** Find the best-matching product reference URL for an image prompt.
 *  Scores by how many meaningful words from the product name appear in the prompt.
 *  e.g. prompt "yellow wheel loader on site" matches product "L9100H Wheel Loader" (2 words). */
function findReferenceUrl(
  prompt: string,
  productImages: Record<string, string>
): string | null {
  if (!productImages || !prompt) return null;
  const promptLower = prompt.toLowerCase();

  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const [productName, url] of Object.entries(productImages)) {
    if (!url) continue;

    // Full name match wins immediately
    if (promptLower.includes(productName.toLowerCase())) return url;

    // Word-level scoring — only words 4+ chars to skip "and", "the" etc.
    const words = productName.toLowerCase().split(/\s+/).filter(w => w.length >= 4);
    const score = words.filter(w => promptLower.includes(w)).length;
    if (score > bestScore) {
      bestScore = score;
      bestUrl   = url;
    }
  }

  return bestScore > 0 ? bestUrl : null;
}

export async function POST(req: NextRequest) {
  try {
    const { postId, prompt } = await req.json();
    if (!postId || !prompt) {
      return NextResponse.json({ error: "postId and prompt required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch post → brand (logo + product reference images) + provider choice
    const { data: post } = await supabase
      .from("posts")
      .select("image_provider, brand_id, brand:brands(logo_url, product_images)")
      .eq("id", postId)
      .single();

    const brand          = post?.brand as any;
    const logoUrl: string | null = brand?.logo_url ?? null;
    const productImages: Record<string, string> = brand?.product_images ?? {};
    const provider       = (post?.image_provider ?? "ideogram") as "ideogram" | "higgsfield";

    // ── Generate raw image URL via the chosen provider ────────────────────────
    let rawUrl: string;

    if (provider === "higgsfield") {
      console.log("[generate-image] Using Higgsfield");
      rawUrl = await generateImageWithHighgsfield(prompt);
    } else {
      // Ideogram: remix against a reference product image if one matches
      const referenceUrl = findReferenceUrl(prompt, productImages);
      if (referenceUrl) {
        console.log("[generate-image] Ideogram remix with reference:", referenceUrl);
        rawUrl = await remixImage(prompt, referenceUrl);
      } else {
        console.log("[generate-image] Ideogram fresh generate");
        rawUrl = await generateImage(prompt);
      }
    }

    // Overlay logo if available
    let finalUrl = rawUrl;
    if (logoUrl) {
      const imageBuffer = await fetchBuffer(rawUrl);
      if (imageBuffer) {
        const composited = await overlayLogo(imageBuffer, logoUrl);
        const storagePath = `post-images/${postId}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(storagePath, composited, { contentType: "image/jpeg", upsert: true });
        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from("post-images")
            .getPublicUrl(storagePath);
          finalUrl = publicUrl;
        }
      }
    }

    await supabase.from("posts").update({ image_url: finalUrl }).eq("id", postId);
    return NextResponse.json({ image_url: finalUrl });
  } catch (err: any) {
    const msg = err?.message ?? JSON.stringify(err) ?? "Unknown error";
    console.error("[generate-image]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
