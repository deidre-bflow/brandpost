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

/** Generate posts for a single platform. totalPosts = postsPerWeek × weeks (e.g. 4×4=16, 2×2=4) */
export async function generatePlatformContent(
  brand: Brand,
  platform: Platform,
  totalPosts: number = 16
): Promise<GeneratedPost[]> {
  const pillars = brand.content_pillars?.length
    ? brand.content_pillars.join(", ")
    : "brand awareness, product highlights, industry insights, customer stories, tips & education";

  const productList = brand.products?.length
    ? brand.products.join(", ")
    : null;

  const prompt = `You are a social media content strategist. Generate exactly ${totalPosts} posts.

BRAND: ${brand.name}
Industry: ${brand.industry ?? "general"} | Tone: ${brand.tone ?? "professional"}
Audience: ${brand.target_audience ?? "general audience"}
Content Pillars: ${pillars}
${productList ? `Products/Equipment: ${productList}` : ""}
Brand Notes: ${brand.notes ?? "none"}
Brand Color: ${brand.primary_color ?? "#000000"}

PLATFORM: ${platform}
GUIDELINE: ${PLATFORM_GUIDES[platform]}

INSTRUCTIONS:
- Generate exactly ${totalPosts} posts numbered 1 through ${totalPosts}
- Spread all content pillars naturally across the 16 posts
- Each post must feel distinct — no repetitive phrasing or structure
- image_prompt: Professional commercial photography prompt for Ideogram AI. Strict rules:
  1. NO brand names, logos, or any readable text/lettering anywhere in the image
  2. The equipment/product MUST be painted in the brand color ${brand.primary_color ?? "#f5a623"} — this is the brand's signature equipment colour
  3. VARY the specific product shown — rotate through different products from the list above across the 16 posts, never repeat the same machine consecutively
  4. VARY the scenario each time: active construction dig, road compaction work, loading material, grading a dirt road, mining site, urban infrastructure project, close-up cab detail, operator POV, aerial establishing shot, dawn golden hour, dusty African bushveld backdrop, etc.
  5. Use cinematic product photography style — dramatic lighting, dust particles, motion blur on moving parts
  6. One concise descriptive sentence only
- Return ONLY a valid JSON array — no markdown, no explanation

[{"postNumber":1,"platform":"${platform}","content":"...","image_prompt":"..."},{"postNumber":${totalPosts},...}]`;

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
