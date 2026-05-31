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

export async function generate30DayContent(
  brand: Brand,
  platforms: Platform[]
): Promise<GeneratedPost[]> {
  const pillars = brand.content_pillars?.length
    ? brand.content_pillars.join(", ")
    : "general brand awareness, product/service highlights, industry insights, customer success stories, tips and education";

  const prompt = `You are a social media content strategist. Generate a 30-day content calendar for the following brand.

BRAND PROFILE:
- Name: ${brand.name}
- Industry: ${brand.industry ?? "Not specified"}
- Tone: ${brand.tone ?? "professional"}
- Target Audience: ${brand.target_audience ?? "general audience"}
- Content Pillars: ${pillars}
- Brand Notes: ${brand.notes ?? "None"}
- Primary Color: ${brand.primary_color ?? "#000000"}

PLATFORMS REQUESTED: ${platforms.join(", ")}

PLATFORM GUIDELINES:
${platforms.map((p) => `• ${PLATFORM_GUIDES[p]}`).join("\n")}

INSTRUCTIONS:
- Generate posts for days 1-30, varying content pillars naturally
- Each post must feel distinct — no repetitive phrasing
- Include an image_prompt: a short (1 sentence) visual description for an AI image generator that matches the post, incorporates the brand's primary color ${brand.primary_color ?? "#000000"}, and suits the platform
- Return ONLY a valid JSON array, no markdown fences, no explanation

OUTPUT FORMAT (JSON array):
[
  {
    "day": 1,
    "platform": "facebook",
    "content": "post text here",
    "image_prompt": "image generation prompt here"
  },
  ...
]

Generate ${30 * platforms.length} posts total (30 per platform).`;

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 16000,
    messages: [{ role: "user", content: prompt }],
  });

  // Extract text content
  const text = message.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");

  // Parse JSON — strip any accidental markdown fences
  const clean = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
  const posts: GeneratedPost[] = JSON.parse(clean);
  return posts;
}
