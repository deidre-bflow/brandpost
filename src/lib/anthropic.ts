import Anthropic from "@anthropic-ai/sdk";
import type { Brand, Platform } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORM_GUIDES: Record<Platform, string> = {
  facebook: "Facebook post: conversational tone, 40-70 words, optional question, 1-2 hashtags.",
  instagram: "Instagram caption: punchy opener, 40-60 words, 3-5 hashtags, CTA.",
  linkedin: "LinkedIn post: professional insight, 50-80 words, 2-3 hashtags, end with a question.",
};

interface GeneratedPost {
  platform: Platform;
  content: string;
  image_prompt: string;
  day: number;
}

/** Generate a batch of posts for a single platform */
export async function generatePlatformBatch(
  brand: Brand,
  platform: Platform,
  startDay: number,
  count: number
): Promise<GeneratedPost[]> {
  const pillars = brand.content_pillars?.length
    ? brand.content_pillars.join(", ")
    : "brand awareness, product highlights, industry insights, customer stories, tips";

  const days = Array.from({ length: count }, (_, i) => startDay + i);

  const prompt = `You are a social media content strategist. Generate exactly ${count} posts.

BRAND: ${brand.name} | Industry: ${brand.industry ?? "general"} | Tone: ${brand.tone ?? "professional"}
AUDIENCE: ${brand.target_audience ?? "general audience"}
PILLARS: ${pillars}
NOTES: ${brand.notes ?? "none"}
COLOR: ${brand.primary_color ?? "#000000"}

PLATFORM: ${platform}
GUIDELINE: ${PLATFORM_GUIDES[platform]}

Generate posts for days: ${days.join(", ")}
- Vary content pillars, no repetitive phrasing
- image_prompt: one sentence for an AI image using brand color ${brand.primary_color ?? "#000000"}
- Return ONLY a valid JSON array, no markdown, no explanation

[{"day":${startDay},"platform":"${platform}","content":"...","image_prompt":"..."},...]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  let clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  if (!clean.endsWith("]")) {
    const lastBrace = clean.lastIndexOf("}");
    if (lastBrace !== -1) clean = clean.slice(0, lastBrace + 1) + "]";
  }

  return JSON.parse(clean) as GeneratedPost[];
}
