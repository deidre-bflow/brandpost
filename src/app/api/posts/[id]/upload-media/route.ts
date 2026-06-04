import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
]);
const ALLOWED_VIDEO_TYPES = new Set([
  "video/mp4", "video/quicktime", "video/webm",
]);

const MAX_IMAGE_BYTES = 10  * 1024 * 1024; // 10 MB
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: postId } = await params;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const isImage = ALLOWED_IMAGE_TYPES.has(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.has(file.type);

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Unsupported file type. Use JPEG, PNG, WebP, GIF, MP4, MOV, or WebM." },
        { status: 400 }
      );
    }

    const maxBytes = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: `File too large. Max ${isVideo ? "100 MB" : "10 MB"}.` },
        { status: 400 }
      );
    }

    const supabase = await createAdminClient();

    // Verify the post exists
    const { data: post } = await supabase
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() ?? (isVideo ? "mp4" : "jpg");
    const bucket      = isVideo ? "post-videos" : "post-images";
    const storagePath = isVideo
      ? `post-videos/${postId}.${ext}`
      : `post-images/${postId}.${ext}`;

    const bytes = await file.arrayBuffer();
    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(storagePath, bytes, { contentType: file.type, upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 500 });
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(storagePath);

    const updateField = isVideo ? { video_url: publicUrl } : { image_url: publicUrl };
    await supabase.from("posts").update(updateField).eq("id", postId);

    return NextResponse.json({
      ...(isVideo ? { video_url: publicUrl } : { image_url: publicUrl }),
      media_type: isVideo ? "video" : "image",
    });
  } catch (err: any) {
    console.error("[upload-media]", err);
    return NextResponse.json({ error: err.message ?? "Upload failed" }, { status: 500 });
  }
}
