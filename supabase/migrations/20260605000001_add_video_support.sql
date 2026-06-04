-- Add video_url column to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create post-videos storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;
