-- Social platform connections (one per brand per platform)
CREATE TABLE public.social_connections (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id         UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL CHECK (platform IN ('facebook','instagram','linkedin')),
  access_token     TEXT NOT NULL,
  account_id       TEXT NOT NULL,   -- page_id (FB), ig_user_id (IG), urn:li:person:xxx (LI)
  account_name     TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, platform)
);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_social_connections" ON public.social_connections
  FOR ALL TO authenticated
  USING  (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()))
  WITH CHECK (brand_id IN (SELECT id FROM public.brands WHERE user_id = auth.uid()));

-- Short-lived pending OAuth state (page selection step)
CREATE TABLE public.pending_oauth (
  key        TEXT PRIMARY KEY,
  brand_id   UUID NOT NULL,
  platform   TEXT NOT NULL,
  data       JSONB NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '10 minutes'
);

-- Track publishing outcomes on posts
ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_url      TEXT,
  ADD COLUMN IF NOT EXISTS published_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS publish_error TEXT;

-- Trigger to keep updated_at current on social_connections
CREATE TRIGGER social_connections_updated_at
  BEFORE UPDATE ON public.social_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
