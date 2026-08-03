# SDLG Social Campaign — Recovery & Workflow Guide

This file exists so that a future Claude Code session (even after a total local machine crash, with no memory of this one) can pick the SDLG South Africa Brandflow campaign back up from scratch. Read this first.

## Where everything lives

- **App code**: this repo, `deidre-bflow/brandpost`, deployed on Vercel (`brandpost-seven.vercel.app`, project `deidre-s-projects2/brandpost`). Shaun (`shaunvanstraaten-sks`) has push access to this repo and is a member of Deidre's Vercel team.
- **Database + storage**: Supabase project ref `wwzphgxzuzpelhxfwmlm`. All post content (captions, images, schedule) lives in the `posts` table and `post-images` storage bucket.
- **Backup assets**: Supabase Storage bucket **`claude-recovery-backup`** (private) in the same project. This bucket is **multi-brand** — Brandflow hosts more than one brand, so assets are namespaced per brand to avoid mixups:

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

**When onboarding a new brand**, add a new `<brand-slug>/` folder following the same four-subfolder pattern, and add an entry to `brands.json` (slug → brand_id from the `brands` table, name, any brand-specific notes like tone/rules). Never drop a new brand's files into an existing brand's folder or into the shared `scripts/` folder.

Currently onboarded: **sdlg-south-africa** (see below for its specifics). Check `brands.json` in the bucket for the full current list — it may have grown since this README was last updated.

## The brand image template (critical — don't skip this)

Every SDLG South Africa post image carries a **logo + headline + tagline overlay** on top of the photo — a bare product photo with no overlay is *not* consistent with what's already been published (this was missed once already and had to be redone). Calibrated against a real approved post (`E7210H_July2026.png`) on a 2048×2048 canvas:

- Logo: `SDLG Official Logo.png`, resized to 400px wide, top-left at (80, 85)
- Headline: SDLG Bold font, ~160px, bottom-left, baseline 198px above the bottom edge (e.g. the machine model, or "SDLG" for factory/heritage posts)
- Tagline: SDLG Medium font (packaged as `RBNo2.1a-Medium.otf`), ~56px, letter-spaced, all-caps, baseline 110px above the bottom edge (e.g. "RELIABILITY IN ACTION")
- Small `za.sdlg.com` bottom-right, Helvetica, ~28px
- All text gets a soft drop shadow (~5px blur) for legibility over photos
- Canvas must be square 2048×2048 (matches Instagram/Facebook 1:1 and every prior post) — landscape source photos need a center-crop to square first

**This template is SDLG-specific** (its fonts, its logo, its exact positioning) — it is not assumed to apply to other brands. A new brand needs its own template calibrated the same way: find a real approved post for that brand if one exists (or ask what look they want), measure/derive logo and text placement, and note it in a new section of this README under that brand's name. Don't reuse SDLG's exact pixel values for a different brand's aspect ratio or logo shape without re-checking.

The reusable compositor is `scripts/brand_overlay.py` (function `apply_overlay(src_path, headline, tagline, out_path)`) plus `scripts/square_crop_factory.py` for cropping landscape photos to square first. As written, `brand_overlay.py`'s font/logo paths are hardcoded constants for SDLG — when a second brand needs the same overlay treatment, genericize it to take `font_dir`/`logo_path` as parameters instead of constants, rather than forking the file.

**Never let AI regenerate the actual machine/product.** Product photos are composited into new (always South African, for SDLG specifically) environments using Higgsfield's `marketing_studio_image` model — pass the real product photo as the `image` role, describe the environment in the prompt. Ideogram is explicitly not to be used for the SDLG brand (Shaun's call) — check whether that rule extends to other brands or was SDLG-specific. The logo/headline/tagline overlay is applied afterward in code (Pillow), never by the image-generation model.

## Creating posts — direct Supabase API (fast path, no browser needed)

Brandflow's own UI requires clicking "Add image" per post, which opens a native OS file picker that browser automation cannot drive — painfully slow for a full month of content. The fix: skip the browser entirely and write straight to Supabase, the same way the app's own code does internally. This works identically for any brand — just swap `BRAND_ID`.

You need the Supabase **service_role** key: Supabase dashboard → this project → Project Settings → API → "service_role" secret. (Vercel's copy of this key is marked "Sensitive" and is write-only — unrecoverable from Vercel, even by the project owner. It must come from Supabase directly, or be re-shared by Shaun.) This key bypasses all Row Level Security — treat it carefully, never commit it, never write it into this repo.

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

- Primary colour `#F5A623`, secondary `#CC1B1B`
- Tone: Professional. Never position as luxury — value-for-money Chinese equipment brand, emphasize reliability/value/nationwide dealer support
- Content pillars: Equipment performance & product features · Parts, service & after-sales support · Operator tips & productivity on site · Industry news & project highlights · Dealer network & customer support
- Caption formula (from real approved posts): short hook → SA-specific location/fact (Cape Town, Durban, Joburg, Limpopo, Northern Cape, eThekwini, quarry/port) → machine spec detail → closing line → `Explore the full SDLG range at https://za.sdlg.com/ or contact your nearest SDLG dealer.` → ~10 hashtags starting `#SDLG #SDLGSouthAfrica`
- August 2026 cadence: Mon/Tue/Thu/Fri, Instagram + Facebook only (LinkedIn dropped for this month), themes: Factory / Electric Machines / Spare Parts

(Other brands get their own subsection here as they're onboarded — don't assume SDLG's rules apply to them.)

## Known app bugs already fixed (2026-08-03)

- `POST /api/generate-caption` and `GET /api/brands/{id}/assets` were missing entirely (orphaned frontend references from a past refactor) — both added, see git history.
- `POST /api/posts/{id}/upload-media` returned `{image_url}` singular instead of `{image_urls}` array (broke the calendar UI's optimistic update) and reused a fixed storage path per post (broke multi-image carousels on 2nd+ upload) — both fixed, see git history.

If similar 404s or upload glitches show up again, check these files first before assuming it's a new bug. These fixes are brand-agnostic — they apply to the whole app, not just SDLG.
