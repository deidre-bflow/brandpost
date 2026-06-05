export type Platform = "facebook" | "instagram" | "linkedin";
export type PostStatus = "draft" | "approved" | "scheduled" | "posted" | "failed";
export type Tone = "professional" | "casual" | "humorous" | "inspirational" | "educational" | "bold";

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  website_url: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  industry: string | null;
  tone: Tone | null;
  target_audience: string | null;
  content_pillars: string[];
  products: string[];
  product_images: Record<string, string>; // { "Road Roller": "https://..." }
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  brand_id: string;
  platform: Platform;
  content: string;
  image_url: string | null;
  video_url: string | null;
  image_prompt: string | null;
  scheduled_for: string | null;
  status: PostStatus;
  generation_batch: string | null;
  // client review
  client_comment: string | null;
  client_approved: boolean;
  client_approved_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  brand?: Pick<Brand, "id" | "name" | "primary_color" | "logo_url">;
}

export interface SocialConnection {
  id: string;
  brand_id: string;
  platform: Platform;
  account_id: string;
  account_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewLink {
  id: string;
  token: string;
  brand_id: string;
  label: string | null;
  expires_at: string | null;
  created_at: string;
}
