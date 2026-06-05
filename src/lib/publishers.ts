const FB = "https://graph.facebook.com/v21.0";

// ── Facebook ──────────────────────────────────────────────────────────────────

export async function publishToFacebook({
  pageId,
  accessToken,
  content,
  imageUrl,
}: {
  pageId: string;
  accessToken: string;
  content: string;
  imageUrl: string | null;
}): Promise<string> {
  if (imageUrl) {
    const body = new URLSearchParams({
      url: imageUrl,
      caption: content,
      access_token: accessToken,
    });
    const res  = await fetch(`${FB}/${pageId}/photos`, { method: "POST", body });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Facebook photo post failed");
    return `https://www.facebook.com/${data.post_id ?? data.id}`;
  }

  const body = new URLSearchParams({ message: content, access_token: accessToken });
  const res  = await fetch(`${FB}/${pageId}/feed`, { method: "POST", body });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Facebook feed post failed");
  return `https://www.facebook.com/${data.id}`;
}

// ── Instagram ─────────────────────────────────────────────────────────────────
// Requires a publicly reachable image URL (Supabase public storage works fine).

export async function publishToInstagram({
  igUserId,
  accessToken,
  content,
  imageUrl,
}: {
  igUserId: string;
  accessToken: string;
  content: string;
  imageUrl: string | null;
}): Promise<string> {
  if (!imageUrl) throw new Error("Instagram requires an image — generate or upload one first.");

  // Step 1 — create media container
  const containerBody = new URLSearchParams({
    image_url: imageUrl,
    caption: content,
    access_token: accessToken,
  });
  const cRes  = await fetch(`${FB}/${igUserId}/media`, { method: "POST", body: containerBody });
  const cData = await cRes.json();
  if (!cRes.ok) throw new Error(cData.error?.message ?? "Instagram container creation failed");

  // Step 2 — publish
  const publishBody = new URLSearchParams({
    creation_id: cData.id,
    access_token: accessToken,
  });
  const pRes  = await fetch(`${FB}/${igUserId}/media_publish`, { method: "POST", body: publishBody });
  const pData = await pRes.json();
  if (!pRes.ok) throw new Error(pData.error?.message ?? "Instagram publish failed");

  return `https://www.instagram.com/p/${pData.id ?? ""}`;
}

// ── LinkedIn ──────────────────────────────────────────────────────────────────

export async function publishToLinkedIn({
  accessToken,
  authorUrn,
  content,
  imageUrl,
}: {
  accessToken: string;
  authorUrn: string; // urn:li:person:{id}  or  urn:li:organization:{id}
  content: string;
  imageUrl: string | null;
}): Promise<string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
  };

  // Attempt to upload image; fall back to text-only on failure
  let mediaAssetUrn: string | null = null;
  if (imageUrl) {
    try {
      mediaAssetUrn = await uploadLinkedInImage(accessToken, authorUrn, imageUrl);
    } catch (e) {
      console.warn("[linkedin] image upload failed — posting text-only:", e);
    }
  }

  const body = {
    author: authorUrn,
    lifecycleState: "PUBLISHED",
    specificContent: {
      "com.linkedin.ugc.ShareContent": {
        shareCommentary: { text: content },
        shareMediaCategory: mediaAssetUrn ? "IMAGE" : "NONE",
        ...(mediaAssetUrn
          ? {
              media: [{
                status: "READY",
                description: { text: "" },
                media: mediaAssetUrn,
                title: { text: "" },
              }],
            }
          : {}),
      },
    },
    visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
  };

  const res  = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST", headers, body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message ?? JSON.stringify(data));

  return `https://www.linkedin.com/feed/update/${data.id ?? ""}`;
}

async function uploadLinkedInImage(
  accessToken: string,
  authorUrn: string,
  imageUrl: string,
): Promise<string> {
  const authHeader = { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };

  // Register upload slot
  const regRes = await fetch("https://api.linkedin.com/v2/assets?action=registerUpload", {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ["urn:li:digitalmediaRecipe:feedshare-image"],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: "OWNER",
          identifier: "urn:li:userGeneratedContent",
        }],
      },
    }),
  });
  const regData   = await regRes.json();
  const uploadUrl = regData.value.uploadMechanism[
    "com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"
  ].uploadUrl as string;
  const assetUrn  = regData.value.asset as string;

  // Fetch image bytes and push to LinkedIn's upload URL
  const imgRes    = await fetch(imageUrl, { signal: AbortSignal.timeout(15_000) });
  const imgBuffer = await imgRes.arrayBuffer();

  await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" },
    body: imgBuffer,
  });

  return assetUrn;
}
