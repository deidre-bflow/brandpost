import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# NOTE: these local paths assume the fonts + logo have been restored from the
# Supabase Storage bucket "claude-recovery-backup" (folders fonts/ and logo/ -
# see ../README.md) to these exact locations. Adjust if restoring elsewhere.
FONT_DIR = r"C:\Users\info\Downloads\Font Pack SDLG"
LOGO_PATH = r"C:\Users\info\Desktop\SDLG August\Ready for Brandflow\By Date\SDLG Official Logo.png"

HEADLINE_FONT = FONT_DIR + r"\SDLG-Bold.otf"
TAGLINE_FONT  = FONT_DIR + r"\RBNo2.1a-Medium.otf"
SMALL_FONT    = FONT_DIR + r"\Helvetica.ttf"

# Calibrated from a real approved post (E7210H_July2026.png, 2048px wide canvas)
LOGO_WIDTH        = 400
LOGO_LEFT         = 80
LOGO_TOP          = 85
TEXT_LEFT         = 80
HEADLINE_SIZE     = 160
HEADLINE_BOTTOM   = 198   # distance from bottom edge to headline baseline
TAGLINE_SIZE      = 56
TAGLINE_BOTTOM    = 110   # distance from bottom edge to tagline baseline
TAGLINE_TRACKING  = 4     # extra px between letters
SMALL_SIZE        = 28
SMALL_RIGHT       = 90
SMALL_BOTTOM      = 118

SHADOW_BLUR   = 5
SHADOW_OFFSET = (3, 4)
SHADOW_OPACITY = 150


def draw_text_with_shadow(base: Image.Image, text: str, font: ImageFont.FreeTypeFont,
                           x: int, y_baseline: int, tracking: int = 0, anchor_right: bool = False):
    """Draws `text` with a soft drop shadow. y_baseline = distance from BOTTOM edge to text baseline."""
    W, H = base.size
    ascent, descent = font.getmetrics()

    if tracking:
        widths = [font.getlength(ch) for ch in text]
        total_w = sum(widths) + tracking * (len(text) - 1)
    else:
        total_w = font.getlength(text)

    layer = Image.new("RGBA", (int(total_w) + 40, ascent + descent + 20), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    cx = 0
    for ch in (text if tracking else [text]):
        ld.text((cx, 10), ch, font=font, fill=(255, 255, 255, 255))
        cx += font.getlength(ch) + tracking if tracking else font.getlength(ch)

    shadow = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    black_layer = Image.new("RGBA", layer.size, (0, 0, 0, 0))
    sd = ImageDraw.Draw(black_layer)
    cx = 0
    for ch in (text if tracking else [text]):
        sd.text((cx, 10), ch, font=font, fill=(0, 0, 0, SHADOW_OPACITY))
        cx += font.getlength(ch) + tracking if tracking else font.getlength(ch)
    shadow = black_layer.filter(ImageFilter.GaussianBlur(SHADOW_BLUR))

    top_y = H - y_baseline - ascent - 10
    left_x = x
    if anchor_right:
        left_x = x - total_w

    base.paste(shadow, (int(left_x) + SHADOW_OFFSET[0], int(top_y) + SHADOW_OFFSET[1]), shadow)
    base.paste(layer, (int(left_x), int(top_y)), layer)


def apply_overlay(src_path: str, headline: str, tagline: str, out_path: str):
    img = Image.open(src_path).convert("RGBA")
    W, H = img.size

    logo = Image.open(LOGO_PATH).convert("RGBA")
    lw, lh = logo.size
    new_h = int(LOGO_WIDTH * lh / lw)
    logo = logo.resize((LOGO_WIDTH, new_h), Image.LANCZOS)

    # soft shadow behind logo for legibility over bright skies
    alpha = logo.split()[-1]
    shadow_logo = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    shadow_logo.paste((0, 0, 0, 120), (0, 0), alpha)
    shadow_logo = shadow_logo.filter(ImageFilter.GaussianBlur(6))
    img.paste(shadow_logo, (LOGO_LEFT + 3, LOGO_TOP + 4), shadow_logo)
    img.paste(logo, (LOGO_LEFT, LOGO_TOP), logo)

    headline_font = ImageFont.truetype(HEADLINE_FONT, HEADLINE_SIZE)
    tagline_font  = ImageFont.truetype(TAGLINE_FONT, TAGLINE_SIZE)
    small_font    = ImageFont.truetype(SMALL_FONT, SMALL_SIZE)

    draw_text_with_shadow(img, headline.upper(), headline_font, TEXT_LEFT, HEADLINE_BOTTOM)
    draw_text_with_shadow(img, tagline.upper(), tagline_font, TEXT_LEFT, TAGLINE_BOTTOM, tracking=TAGLINE_TRACKING)
    draw_text_with_shadow(img, "za.sdlg.com", small_font, W - SMALL_RIGHT, SMALL_BOTTOM, anchor_right=True)

    img.convert("RGB").save(out_path, "JPEG", quality=92)
    print(f"Saved {out_path}")


if __name__ == "__main__":
    src, headline, tagline, out = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
    apply_overlay(src, headline, tagline, out)
