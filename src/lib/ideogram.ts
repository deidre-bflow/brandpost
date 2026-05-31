export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch("https://api.ideogram.ai/generate", {
    method: "POST",
    headers: {
      "Api-Key": process.env.IDEOGRAM_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_request: {
        prompt,
        aspect_ratio: "ASPECT_1_1",   // square — works for all 3 platforms
        model: "V_2",
        magic_prompt_option: "AUTO",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ideogram error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const url: string = data?.data?.[0]?.url;
  if (!url) throw new Error("Ideogram returned no image URL");
  return url;
}
