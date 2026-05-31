import Anthropic from "@anthropic-ai/sdk";
import type { Brand, Platform } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORM_GUIDES: Record<Platform, string> = {
  facebook: "Facebook post: conversational tone, 100-250 words, can include a question to drive engagement, 1-3 relevant hashtags at end.",
  instagram: "Instagram caption: visually descriptive, punchy opening line, 80-150 words, 5-10 relevant hashtags at end, include a CTA.",
  linkedin: "LinkedIn post: professional tone, thought-leadership angle, 100-200 words, 2-4 industry hashtags, end with an insight or question.",
};

interface GeneratedPost {
  platform: Platform;
  content: string;
  image_prompt: string;
  day: number;
}

/** Generate 30 posts for a SINGLE platform — keeps each API call small and fast */
export async function generatePlatformContent(
  brand: Brand,
  platform: Platform
): Promise<GeneratedPost[]> {
  const pillars = brand.content_pillars?.length
    ? brand.content_pillars.join(", ")
    : "general brand awareness, product/service highlights, industry insights, customer success stories, tips and education";

  const prompt = `You are a social media content strategist. Generate exactly 30 posts for ONE platform.

BRAND PROFILE:
- Name: ${brand.name}
- Industry: ${brand.industry ?? "Not specified"}
- Tone: ${brand.tone ?? "professional"}
- Target Audience: ${brand.target_audience ?? "general audience"}
- Content Pillars: ${pillars}
- Brand Notes: ${brand.notes ?? "None"}
- Primary Color: ${brand.primary_color ?? "#000000"}

PLATFORM: ${platform}
GUIDELINE: ${PLATFORM_GUIDES[platform]}

INSTRUCTIONS:
- Generate exactly 30 posts for days 1–30
- Vary the content pillars naturally across the 30 days
- Each post must feel distinct — no repetitive phrasing
- image_prompt: one sentence describing an AI-generated image matching the post, using the brand's primary color ${brand.primary_color ?? "#000000"}
- Return ONLY a valid JSON array — no markdown, no explanation, nothing else

[{"day":1,"platform":"${platform}","content":"...","image_prompt":"..."},...]`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 12000,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const posts: GeneratedPost[] = JSON.parse(clean);
  return posts;
}

/** Generate 30 days for all requested platforms — calls API once per platform */
export async function generate30DayContent(
  brand: Brand,
  platforms: Platform[]
): Promise<GeneratedPost[]> {
  // Sequential per-platform calls — keeps each under 15 seconds
  const results: GeneratedPost[] = [];
  for (const platform of platforms) {
    const posts = await generatePlatformContent(brand, platform);
    results.push(...posts);
  }
  return results;
}
