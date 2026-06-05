-- Audit trail: who approved each post
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS client_name     TEXT,
  ADD COLUMN IF NOT EXISTS client_position TEXT;

-- Allow review links to target a specific subset of posts (for re-share of declined)
ALTER TABLE public.review_links
  ADD COLUMN IF NOT EXISTS post_ids UUID[];
