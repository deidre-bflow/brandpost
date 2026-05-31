import { NextRequest, NextResponse } from "next/server";
import { generateImage } from "@/lib/ideogram";
import { createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { postId, prompt } = await req.json();
    if (!postId || !prompt) {
      return NextResponse.json({ error: "postId and prompt required" }, { status: 400 });
    }

    const imageUrl = await generateImage(prompt);

    // Save image_url back to the post
    const supabase = await createAdminClient();
    const { error } = await supabase
      .from("posts")
      .update({ image_url: imageUrl })
      .eq("id", postId);
    if (error) throw new Error(error.message);

    return NextResponse.json({ image_url: imageUrl });
  } catch (err: any) {
    console.error("[generate-image]", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
