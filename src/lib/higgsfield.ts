/**
 * Higgsfield image generation — REST API
 *
 * Docs:     https://docs.higgsfield.ai/docs
 * Base URL: https://platform.higgsfield.ai
 * Auth:     Authorization: Key {KEY_ID}:{SECRET}
 *
 * Flow:
 *   POST /{model_id}  →  { request_id, status_url }
 *   GET  /requests/{request_id}/status  (poll until completed)
 *   →    { status: "completed", images: [{ url }] }
 */

const BASE = "https://platform.higgsfield.ai";

/** Model IDs available via REST API */
export type HiggsfieldModel =
  | "higgsfield-ai/soul/standard"  // flagship text-to-image (default)
  | "reve/text-to-image";          // versatile alternative

const getAuth = () => {
  const id     = process.env.HIGGSFIELD_API_KEY_ID;
  const secret = process.env.HIGGSFIELD_API_SECRET;
  if (!id || !secret) throw new Error("HIGGSFIELD_API_KEY_ID and HIGGSFIELD_API_SECRET are not configured");
  return `Key ${id}:${secret}`;
};

export async function generateImageWithHighgsfield(
  prompt: string,
  model: HiggsfieldModel = "higgsfield-ai/soul/standard",
): Promise<string> {
  const authorization = getAuth();

  // ── 1. Submit generation request ──────────────────────────────────────────
  const submitRes = await fetch(`${BASE}/${model}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "1:1",
      resolution:   "1080p",
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const submitData = await submitRes.json();

  if (!submitRes.ok) {
    throw new Error(
      submitData?.error ?? submitData?.message ?? `Higgsfield submit error ${submitRes.status}`,
    );
  }

  const requestId: string = submitData?.request_id;
  if (!requestId) throw new Error("Higgsfield returned no request_id");

  // ── 2. Poll for completion (max 90 s, 3 s interval) ───────────────────────
  for (let attempt = 0; attempt < 30; attempt++) {
    await delay(3_000);

    const statusRes = await fetch(`${BASE}/requests/${requestId}/status`, {
      headers: { Authorization: authorization },
      signal: AbortSignal.timeout(10_000),
    });

    const statusData = await statusRes.json();
    const status: string = statusData?.status ?? "";

    switch (status) {
      case "completed": {
        const url = statusData?.images?.[0]?.url ?? statusData?.video?.url;
        if (url) return url;
        throw new Error("Higgsfield completed but returned no image URL");
      }
      case "failed":
        throw new Error(statusData?.error ?? "Higgsfield generation failed");
      case "nsfw":
        throw new Error("Higgsfield: prompt was rejected by content moderation");
      // "queued" | "in_progress" → keep polling
    }
  }

  throw new Error("Higgsfield generation timed out after 90 s");
}

const delay = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
