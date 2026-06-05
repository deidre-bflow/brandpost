/**
 * Higgsfield image generation
 *
 * Auth:  Authorization: Bearer {HIGGSFIELD_API_SECRET}
 * MCP:   https://mcp.higgsfield.ai/mcp  (JSON-RPC over SSE)
 *
 * Best models for social media posts:
 *   marketing_studio_image — branded commercial/product ads
 *   gpt_image_2            — default high-fidelity, text/graphics
 *   nano_banana_pro        — character/cartoon, top quality
 *   text2image_soul_v2     — lifestyle/fashion/UGC editorial
 */

const MCP_URL = "https://mcp.higgsfield.ai/mcp";

export type HiggsfieldModel =
  | "marketing_studio_image"
  | "gpt_image_2"
  | "nano_banana_pro"
  | "nano_banana_2"
  | "text2image_soul_v2";

export async function generateImageWithHighgsfield(
  prompt: string,
  model: HiggsfieldModel = "gpt_image_2",
): Promise<string> {
  const secret = process.env.HIGGSFIELD_API_SECRET;
  if (!secret) throw new Error("HIGGSFIELD_API_SECRET is not configured");

  const headers = {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  // ── Call via MCP HTTP transport (JSON-RPC over SSE) ───────────────────────
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "generate_image",
        arguments: {
          params: {
            model,
            prompt,
            aspect_ratio: "1:1",
          },
        },
      },
      id: Date.now(),
    }),
    signal: AbortSignal.timeout(120_000), // 2 min — generation can take ~30–60s
  });

  if (!res.ok) {
    throw new Error(`Higgsfield MCP HTTP ${res.status}: ${await res.text().catch(() => "")}`);
  }

  // ── Parse SSE response ────────────────────────────────────────────────────
  const body   = await res.text();
  const lines  = body.split("\n").filter(l => l.startsWith("data:"));

  for (const line of lines) {
    try {
      const data = JSON.parse(line.slice(5));

      // Error from generation backend
      if (data?.result?.isError) {
        const msg = data.result.structuredContent?.error
          ?? data.result.content?.[0]?.text
          ?? "Higgsfield generation failed";
        throw new Error(msg);
      }

      // Success — extract image URL from content
      if (data?.result?.content) {
        for (const item of data.result.content) {
          // Image item
          if (item.type === "image" && item.url) return item.url;
          if (item.type === "image" && item.data) {
            // base64 — upload to Supabase instead of returning inline
            // (rare — most models return URLs)
            return `data:image/jpeg;base64,${item.data}`;
          }
          // URL embedded in text
          if (item.type === "text") {
            const match = item.text?.match(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/i);
            if (match) return match[0];
            // Some models return structured JSON with URL
            try {
              const parsed = JSON.parse(item.text ?? "");
              const url = parsed?.url ?? parsed?.image_url ?? parsed?.output?.[0]?.url;
              if (url) return url;
            } catch { /* not JSON */ }
          }
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("generation")) throw e;
      // Parse error on this line — continue to next
    }
  }

  throw new Error("Higgsfield returned no image URL in response");
}
