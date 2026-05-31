import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ideogram";
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
  if (!logoBuffer) return imageBuffer; // no logo — return original

  try {
    // Resize logo to fit inside 140 × 70 px, preserve aspect ratio
    const resized = await sharp(logoBuffer)
      .resize(140, 70, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    const { width: lw = 120, height: lh = 60 } = await sharp(resized).metadata();
    const PAD = 10;
    const bw = lw + PAD * 2;
    const bh = lh + PAD * 2;

    // White rounded-rectangle badge behind the logo
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
    console.error("[logo-overlay] failed, returning original:", e);
    return imageBuffer; // graceful fallback
  }
}

export async function POST(req: NextRequest) {
  try {
    const { postId, prompt } = await req.json();
    if (!postId || !prompt) {
      return NextResponse.json({ error: "postId and prompt required" }, { status: 400 });
    }

    const supabase = await createAdminClient();

    // Fetch post → brand logo
    const { data: post } = await supabase
      .from("posts")
      .select("brand_id, brand:brands(logo_url)")
      .eq("id", postId)
      .single();

    const logoUrl: string | null = (post?.brand as any)?.logo_url ?? null;

    // Generate base image with Ideogram
    const ideogramUrl = await generateImage(prompt);

    let finalUrl = ideogramUrl;

    if (logoUrl) {
      const imageBuffer = await fetchBuffer(ideogramUrl);
      if (imageBuffer) {
        const composited = await overlayLogo(imageBuffer, logoUrl);

        // Upload composited image to Supabase Storage
        const storagePath = `post-images/${postId}.jpg`;
        const { error: uploadErr } = await supabase.storage
          .from("post-images")
          .upload(storagePath, composited, {
            contentType: "image/jpeg",
            upsert: true,
          });

        if (!uploadErr) {
          const { data: { publicUrl } } = supabase.storage
            .from("post-images")
            .getPublicUrl(storagePath);
          finalUrl = publicUrl;
        } else {
          console.error("[generate-image] storage upload failed:", uploadErr.message);
          // Fall back to plain Ideogram URL if storage fails
        }
      }
    }

    // Save final URL to post
    await supabase.from("posts").update({ image_url: finalUrl }).eq("id", postId);

    return NextResponse.json({ image_url: finalUrl });
  } catch (err: any) {
    console.error("[generate-image]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
