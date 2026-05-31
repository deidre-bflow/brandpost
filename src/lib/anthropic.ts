import Anthropic from "@anthropic-ai/sdk";
import type { Brand, Platform } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORM_GUIDES: Record<Platform, string> = {
  facebook: "Facebook post: conversational tone, 60-100 words, optional engaging question, 1-2 hashtags.",
  instagram: "Instagram caption: punchy opener, 50-80 words, 4-6 hashtags, include a CTA.",
  linkedin: "LinkedIn post: professional insight, 70-100 words, 2-3 hashtags, end with a question or insight.",
};

// 4 posts per week: Mon, Tue, Thu, Fri (day offsets within each week)
export const WEEKLY_DAY_OFFSETS = [0, 1, 3, 4];

export interface GeneratedPost {
  platform: Platform;
  content: string;
  image_prompt: string;
  postNumber: number; // 1–16
}

/** Generate 16 posts (4/week × 4 weeks) for a single platform */
export async function generatePlatformContent(
  brand: Brand,
  platform: Platform
): Promise<GeneratedPost[]> {
  const pillars = brand.content_pillars?.length
    ? brand.content_pillars.join(", ")
    : "brand awareness, product highlights, industry insights, customer stories, tips & education";

  const prompt = `You are a social media content strategist. Generate exactly 16 posts (4 per week × 4 weeks).

BRAND: ${brand.name}
Industry: ${brand.industry ?? "general"} | Tone: ${brand.tone ?? "professional"}
Audience: ${brand.target_audience ?? "general audience"}
Content Pillars: ${pillars}
Brand Notes: ${brand.notes ?? "none"}
Brand Color: ${brand.primary_color ?? "#000000"}

PLATFORM: ${platform}
GUIDELINE: ${PLATFORM_GUIDES[platform]}

INSTRUCTIONS:
- Generate exactly 16 posts numbered 1 through 16
- Spread all content pillars naturally across the 16 posts
- Each post must feel distinct — no repetitive phrasing or structure
- image_prompt: one vivid sentence describing an AI-generated image that fits the post, incorporating brand color ${brand.primary_color ?? "#000000"}
- Return ONLY a valid JSON array — no markdown, no explanation

[{"postNumber":1,"platform":"${platform}","content":"...","image_prompt":"..."},...]`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5",
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
