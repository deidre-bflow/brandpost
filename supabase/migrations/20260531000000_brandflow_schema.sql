-- BrandFlow — initial schema
-- Run this in your NEW Supabase project (SQL editor)

/* ── brands ─────────────────────────────────────────────────────── */
CREATE TABLE public.brands (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  website_url      TEXT,
  logo_url         TEXT,
  primary_color    TEXT DEFAULT '#8b5cf6',
  secondary_color  TEXT DEFAULT '#a78bfa',
  accent_color     TEXT,
  industry         TEXT,
  tone             TEXT DEFAULT 'professional'
                   CHECK (tone IN ('professional','casual','humorous','inspirational','educational','bold')),
  target_audience  TEXT,
  content_pillars  TEXT[] NOT NULL DEFAULT '{}',
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* ── posts ───────────────────────────────────────────────────────── */
CREATE TABLE public.posts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id          UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform          TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin')),
  content           TEXT NOT NULL,
  image_url         TEXT,
  image_prompt      TEXT,
  scheduled_for     TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','approved','scheduled','posted','failed')),
  generation_batch  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

/* ── RLS ─────────────────────────────────────────────────────────── */
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts  ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own brands
CREATE POLICY "owner_brands" ON public.brands
  FOR ALL TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can only see/edit posts for their own brands
CREATE POLICY "owner_posts" ON public.posts
  FOR ALL TO authenticated
  USING  (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

/* ── service_role grants (for API routes) ────────────────────────── */
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

/* ── updated_at triggers ─────────────────────────────────────────── */
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER brands_updated_at BEFORE UPDATE ON public.brands
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER posts_updated_at  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
