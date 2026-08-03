# SDLG Social Campaign — Recovery & Workflow Guide

This file exists so that a future Claude Code session (even after a total local machine crash, with no memory of this one) can pick the Brandflow campaigns back up from scratch. Read this first.

## Where everything lives

App code: this repo, `deidre-bflow/brandpost`, deployed on Vercel (`brandpost-seven.vercel.app`, project `deidre-s-projects2/brandpost`). Shaun (`shaunvanstraaten-sks`) has push access to this repo and is a member of Deidre's Vercel team.

Database + storage: Supabase project ref `wwzphgxzuzpelhxfwmlm`. All post content (captions, images, schedule) lives in the `posts` table and `post-images` storage bucket.

Backup assets: Supabase Storage bucket `claude-recovery-backup` (private) in the same project. This bucket is multi-brand — Brandflow hosts more than one brand, so assets are namespaced per brand to avoid mixups:

```
claude-recovery-backup/
  brands.json              ← manifest: slug → {brand_id, name, vercel_project, notes}
  scripts/                 ← shared, brand-agnostic Python tools (not brand-specific)
  <brand-slug>/            ← one folder per brand, e.g. "sdlg-south-africa"
    fonts/                 ← that brand's font files (only if it has its own brand fonts)
    logo/                  ← that brand's logo
    source-images-original/← untouched product/scene photos before any overlay
    final-images-<YYYY-MM>/← finished, calendar-ready images for that month
```

Public brand assets (logos, product reference photos used by Brandflow's own "New Brand" form and by Higgsfield generations) live in a separate **public** bucket, `brand-assets`, also namespaced per brand:

```
brand-assets/
  <brand-slug>/
    logo/
    products/            ← raw/source product photos
    reference-cards/     ← real, already-published posts used as the style precedent for that brand's template
```

When onboarding a new brand, add a new `<brand-slug>/` folder (in both buckets as relevant) following the same pattern, and add an entry to `brands.json` (slug → brand_id from the `brands` table, name, any brand-specific notes like tone/rules). Never drop a new brand's files into an existing brand's folder or into the shared `scripts/` folder.

**Currently onboarded: `sdlg-south-africa`, `sks-hydraulics-africa`** (see below for each brand's specifics). Check `brands.json` in the bucket for the full current list — it may have grown since this README was last updated.

## The brand image template (critical — don't skip this)

Every brand's post image carries its own fixed visual template on top of the photo — a bare product photo with no overlay is not consistent with what's already been published for that brand. **A template calibrated for one brand is never assumed to apply to another** — always find real approved posts for the specific brand, measure/derive the template from them, and note it below under that brand's own section.

### SDLG South Africa template

Calibrated against a real approved post (`E7210H_July2026.png`) on a 2048×2048 canvas:

- Logo: `SDLG Official Logo.png`, resized to 400px wide, top-left at (80, 85)
- Headline: SDLG Bold font, ~160px, bottom-left, baseline 198px above the bottom edge (e.g. the machine model, or "SDLG" for factory/heritage posts)
- Tagline: SDLG Medium font (packaged as `RBNo2.1a-Medium.otf`), ~56px, letter-spaced, all-caps, baseline 110px above the bottom edge (e.g. "RELIABILITY IN ACTION")
- Small `za.sdlg.com` bottom-right, Helvetica, ~28px
- All text gets a soft drop shadow (~5px blur) for legibility over photos
- Canvas must be square 2048×2048 (matches Instagram/Facebook 1:1 and every prior post) — landscape source photos need a center-crop to square first

The reusable compositor is `scripts/brand_overlay.py` (function `apply_overlay(src_path, headline, tagline, out_path)`) plus `scripts/square_crop_factory.py` for cropping landscape photos to square first. Its font/logo paths are hardcoded constants for SDLG specifically.

### SKS Hydraulics Africa template

Calibrated against multiple real, already-published reference posts (`RexrothA10VO-CTA.jpg` was the primary one used; also `Card1-FullRange.jpeg`, `Card3-StopOverpaying.jpeg`, `Card4-WorldMap.jpeg`, `Card5-NameplateMatch.jpeg`, `F12M-NowInStock.jpeg`, `TrustedGloballyNowLocally.jpg`, all backed up under `brand-assets/sks-hydraulics-africa/reference-cards/`). SKS's real published posts actually use several different layouts (collage, world-map stats, nameplate-match CTA, product-in-stock) — the Rexroth-style layout below was chosen as the first reusable template because it generalizes best; the others remain useful references for future template variants.

Rexroth-style layout, 2048×2048 canvas, black (`#0D0D0D`) background with a subtle repeating hexagon-outline texture:

- Real product photo, left side, bleeding to the bottom edge (composited onto a clean blurred dark industrial-workshop background via Higgsfield `marketing_studio_image` first — never let AI redraw the actual part, only the environment/lighting around it)
- Round SKS badge logo (`SKS-Official-Logo.png`), top-right corner
- Headline in Poppins ExtraBold (white), e.g. "Looking for {Product} " + a gold (`#F5A623`) highlighted phrase, e.g. "at unbeatable pricing?" — word-wrapped to fit the column width, never hardcoded line breaks
- Subhead "Contact SKS Hydraulics Africa." in Poppins Bold, white
- Bullet checklist (gold triangle marker + white Poppins Bold text), e.g. "Local Stock" / "Jet Park, Boksburg"
- WhatsApp CTA bar: green circle with a simple drawn handset glyph (no external icon asset needed) + "WhatsApp: 076 165 0400" in gold + "for Quick Responses" in white, small

The reusable compositor is `scripts/sks_overlay.py` (function `render_card(...)`), font/logo paths are parameters (not hardcoded), so it's straightforward to adapt for a third brand. Validated with a test render using the `K3V63DT-composited.png` Higgsfield output — no text overflow, no overlap.

## Creating posts — direct Supabase API (fast path, no browser needed)

Brandflow's own UI requires clicking "Add image" per post, which opens a native OS file picker that browser automation cannot drive — painfully slow for a full month of content. The fix: skip the browser entirely and write straight to Supabase, the same way the app's own code does internally. This works identically for any brand — just swap `BRAND_ID`.

You need the Supabase service_role key: Supabase dashboard → this project → Project Settings → API → "service_role" secret. (Vercel's copy of this key is marked "Sensitive" and is write-only — unrecoverable from Vercel, even by the project owner. It must come from Supabase directly, or be re-shared by Shaun.) This key bypasses all Row Level Security — treat it carefully, never commit it, never write it into this repo.

```python
import json, urllib.request, urllib.error

SUPA_URL = "https://wwzphgxzuzpelhxfwmlm.supabase.co"
SUPA_KEY = "<service_role key — get fresh from Shaun or Supabase dashboard>"
BRAND_ID = "fb34a9bc-015a-4708-9d8c-f6f64f94a9df"  # SDLG South Africa — swap per brand, see brands.json in the bucket

def supa_request(method, path, body=None, extra_headers=None, is_json=True):
    headers = {"apikey": SUPA_KEY, "Authorization": f"Bearer {SUPA_KEY}"}
    if is_json: headers["Content-Type"] = "application/json"
    if extra_headers: headers.update(extra_headers)
    data = json.dumps(body).encode() if (body is not None and is_json) else body
    req = urllib.request.Request(f"{SUPA_URL}{path}", data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r: return r.status, r.read()
    except urllib.error.HTTPError as e: return e.code, e.read()

# 1. Insert the post row, get its id back
status, resp = supa_request("POST", "/rest/v1/posts", {
    "brand_id": BRAND_ID, "platform": "instagram", "content": "<exact caption + hashtags>",
    "image_prompt": "n/a", "image_provider": "higgsfield",
    "scheduled_for": "2026-09-01T08:00:00", "status": "draft", "image_urls": [],
}, extra_headers={"Prefer": "return=representation"})
post_id = json.loads(resp)[0]["id"]

# 2. Upload the (already-overlaid) image to Storage
with open("final_image.jpg", "rb") as f: img_bytes = f.read()
supa_request("POST", f"/storage/v1/object/post-images/{post_id}.jpg", body=img_bytes,
             extra_headers={"Content-Type": "image/jpeg", "x-upsert": "true"}, is_json=False)

# 3. Point the post at the uploaded image
public_url = f"{SUPA_URL}/storage/v1/object/public/post-images/{post_id}.jpg"
supa_request("PATCH", f"/rest/v1/posts?id=eq.{post_id}", {"image_urls": [public_url], "image_url": public_url})
```

This was validated end-to-end creating 17 real posts in ~10 seconds with zero errors (2026-08-03).

## Brand kit reference — SDLG South Africa (as configured in Brandflow)

- Brand ID: `fb34a9bc-015a-4708-9d8c-f6f64f94a9df`
- Primary colour `#F5A623`, secondary `#CC1B1B`
- Tone: Professional. Never position as luxury — value-for-money Chinese equipment brand, emphasize reliability/value/nationwide dealer support
- Content pillars: Equipment performance & product features · Parts, service & after-sales support · Operator tips & productivity on site · Industry news & project highlights · Dealer network & customer support
- Caption formula (from real approved posts): short hook → SA-specific location/fact (Cape Town, Durban, Joburg, Limpopo, Northern Cape, eThekwini, quarry/port) → machine spec detail → closing line → `Explore the full SDLG range at https://za.sdlg.com/ or contact your nearest SDLG dealer.` → ~10 hashtags starting `#SDLG #SDLGSouthAfrica`
- August 2026 cadence: Mon/Tue/Thu/Fri, Instagram + Facebook only (LinkedIn dropped for this month), themes: Factory / Electric Machines / Spare Parts

## Brand kit reference — SKS Hydraulics Africa (as configured in Brandflow, onboarded 2026-08-03)

- Brand ID: `2df71037-e4ef-46b5-b397-31f236ce4a3d`
- Website `www.skshydraulics.co.za`, WhatsApp `+27 76 165 0400`, address Unit 12, Yaldwyn Rd, Jet Park, Boksburg
- Primary colour `#F5A623` (gold), secondary `#0D0D0D` (near-black)
- Tone: Bold. Position as OEM-spec quality at non-OEM pricing — never as "cheap" or low-quality. Never mention competitor names.
- Content pillars (rotating): Value/pricing pitch (non-OEM parts at OEM spec, up to 60% less) · Product spotlight / now in stock · Company credibility & scale (30+ countries, 15,000+ SKUs, founded 1982) · Nameplate-match service (send a photo, get instant cross-reference & quote) · Downtime-cost urgency (fast dispatch keeps fleets running)
- Cadence: 3x/week, Mon/Wed/Fri, Instagram + Facebook only
- Fonts: Anton (condensed display, for tall shout-style headlines used in some reference layouts) and Poppins ExtraBold/Bold (rounded sans, used in the primary `sks_overlay.py` template) — both free Google Fonts (OFL), backed up at `claude-recovery-backup/sks-hydraulics-africa/fonts/`. No brand-specific font file was supplied; these are a visual match, not the brand's actual typeface.
- Real product photos (raw, pre-Higgsfield) are backed up at `brand-assets/sks-hydraulics-africa/products/` — includes K3V112DT, K3V112DTP, K3V63DT, MFE19 (×2), TA1919, gauge test kit (×2), Rexroth A10VO
- (Not yet posted this onboarding session — brand kit + template pipeline only. Actual September content still needs to be generated and scheduled.)

## Known app bugs already fixed (2026-08-03)

- `POST /api/generate-caption` and `GET /api/brands/{id}/assets` were missing entirely (orphaned frontend references from a past refactor) — both added, see git history.
- `POST /api/posts/{id}/upload-media` returned `{image_url}` singular instead of `{image_urls}` array (broke the calendar UI's optimistic update) and reused a fixed storage path per post (broke multi-image carousels on 2nd+ upload) — both fixed, see git history.

If similar 404s or upload glitches show up again, check these files first before assuming it's a new bug. These fixes are brand-agnostic — they apply to the whole app, not just SDLG.
