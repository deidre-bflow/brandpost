-- Track which AI provider should generate images for each post
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS image_provider TEXT NOT NULL DEFAULT 'ideogram'
  CHECK (image_provider IN ('ideogram', 'higgsfield'));
