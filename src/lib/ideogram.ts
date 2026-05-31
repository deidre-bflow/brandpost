/** Generate a brand-new image from a text prompt */
export async function generateImage(prompt: string, apiKey?: string): Promise<string> {
  const key = apiKey ?? process.env.IDEOGRAM_API_KEY!;
  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: { "Api-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_1_1",
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    }),
  });
  if (!res.ok) throw new Error(`Ideogram generate error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const url: string = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");
  return url;
}

/** Remix an existing reference image into a new scene using a text prompt.
 *  Downloads the reference image, uploads it as multipart to Ideogram /remix. */
export async function remixImage(
  prompt: string,
  referenceUrl: string,
  apiKey?: string
): Promise<string> {
  const key = apiKey ?? process.env.IDEOGRAM_API_KEY!;

  // 1. Download the reference image
  const refRes = await fetch(referenceUrl, { signal: AbortSignal.timeout(15000) });
  if (!refRes.ok) throw new Error(`Could not fetch reference image: ${refRes.status}`);
  const refBuffer = Buffer.from(await refRes.arrayBuffer());
  const contentType = refRes.headers.get("content-type") ?? "image/png";

  // 2. Build multipart form
  const form = new FormData();
  form.append(
    "image_request",
    JSON.stringify({
      prompt,
      aspect_ratio: "ASPECT_1_1",
      model: "V_2",
      image_weight: 65,           // 65% reference, 35% creative freedom
      magic_prompt_option: "AUTO",
      style_type: "REALISTIC",
    })
  );
  form.append(
    "image_file",
    new Blob([refBuffer], { type: contentType }),
    "reference.png"
  );

  // 3. Call /remix
  const res = await fetch("https://api.ideogram.ai/remix", {
    method: "POST",
    headers: { "Api-Key": key },
    body: form,
  });
  if (!res.ok) throw new Error(`Ideogram remix error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const url: string = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram remix returned no image URL");
  return url;
}
