-- Client review fields on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS client_comment     TEXT,
  ADD COLUMN IF NOT EXISTS client_approved    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ;

-- Review links: a shareable token that maps to a brand
CREATE TABLE IF NOT EXISTS public.review_links (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token      UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  brand_id   UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  label      TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.review_links ENABLE ROW LEVEL SECURITY;

-- Brand owners manage their own review links
CREATE POLICY "owner_review_links" ON public.review_links
  FOR ALL TO authenticated
  USING  (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));
