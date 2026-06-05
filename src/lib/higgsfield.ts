/**
 * Higgsfield image generation
 * Docs: https://docs.higgsfield.ai
 *
 * Models suited for social media posts:
 *   marketing_studio_image — commercial / product / ads  (default)
 *   nano_banana_pro        — highest quality, 4K
 *   soul_2                 — portraits / fashion / UGC
 */

const BASE    = "https://api.higgsfield.ai";
const getKey  = () => process.env.HIGGSFIELD_API_KEY ?? "";

export type HiggsfieldModel =
  | "marketing_studio_image"
  | "nano_banana_pro"
  | "soul_2";

export async function generateImageWithHighgsfield(
  prompt: string,
  model: HiggsfieldModel = "marketing_studio_image",
): Promise<string> {
  const apiKey = getKey();
  if (!apiKey) throw new Error("HIGGSFIELD_API_KEY is not configured");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  // ── Submit generation job ─────────────────────────────────────────────────
  const submitRes = await fetch(`${BASE}/v1/generation`, {
    method:  "POST",
    headers,
    body: JSON.stringify({
      model,
      prompt,
      aspect_ratio: "1:1",
      num_samples:  1,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  const submitData = await submitRes.json();

  if (!submitRes.ok) {
    throw new Error(
      submitData?.message ?? submitData?.error ?? `Higgsfield ${submitRes.status}`,
    );
  }

  // Some models return the URL immediately; others return a job ID to poll.
  const immediateUrl = pickUrl(submitData);
  if (immediateUrl) return immediateUrl;

  const jobId =
    submitData?.job_id ??
    submitData?.id     ??
    submitData?.generation_id;

  if (!jobId) throw new Error("Higgsfield returned no job ID or image URL");

  // ── Poll for completion (max 60 s, 2 s interval) ──────────────────────────
  for (let i = 0; i < 30; i++) {
    await delay(2_000);

    const pollRes  = await fetch(`${BASE}/v1/generation/${jobId}`, { headers });
    const pollData = await pollRes.json();
    const status   = (pollData?.status ?? "").toLowerCase();

    if (["completed", "success", "succeeded", "done"].includes(status)) {
      const url = pickUrl(pollData);
      if (url) return url;
      throw new Error("Higgsfield completed but no image URL in response");
    }

    if (["failed", "error", "cancelled"].includes(status)) {
      throw new Error(pollData?.error ?? pollData?.message ?? "Higgsfield generation failed");
    }
    // status is pending/processing — keep polling
  }

  throw new Error("Higgsfield image generation timed out after 60 s");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickUrl(data: any): string | null {
  if (!data) return null;
  return (
    data?.output?.[0]?.url ??
    data?.images?.[0]?.url ??
    data?.results?.[0]?.url ??
    data?.data?.[0]?.url   ??
    data?.url              ??
    data?.image_url        ??
    null
  );
}

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
