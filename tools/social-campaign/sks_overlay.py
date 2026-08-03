"""
SKS Hydraulics Africa -- reusable card template generator.
Modeled on the approved "Rexroth A10VO" reference post: real product photo
(left) + round SKS badge (top-right) + bold headline with a gold-highlighted
phrase + bullet checklist + WhatsApp CTA bar, all on a black/hex-pattern
background. Font/logo paths are parameters, not hardcoded, so this can be
adapted to other brands the way brand_overlay.py (SDLG) was not.

Assets backed up in Supabase Storage:
  brand-assets/sks-hydraulics-africa/{logo,products,reference-cards}/  (public)
  claude-recovery-backup/sks-hydraulics-africa/fonts/                 (private)
"""
import math
import os
from PIL import Image, ImageDraw, ImageFont

CANVAS = 2048
GOLD = (245, 166, 35)
WHITE = (255, 255, 255)
BLACK = (13, 13, 13)
WHATSAPP_GREEN = (37, 211, 102)


def hex_pattern(size, fg=(255, 255, 255), alpha=14, cell=64):
    """Subtle repeating hexagon-outline texture, matching the reference cards' background."""
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    r = cell / 2
    dx = r * math.sqrt(3)
    dy = r * 1.5
    col = (*fg, alpha)
    row = 0
    y = -cell
    while y < size + cell:
        x_offset = (dx / 2) if row % 2 else 0
        x = -cell + x_offset
        while x < size + cell:
            pts = [
                (x + r * math.sin(math.radians(a)), y + r * math.cos(math.radians(a)))
                for a in range(0, 360, 60)
            ]
            draw.polygon(pts, outline=col)
            x += dx
        y += dy
        row += 1
    return layer


def draw_whatsapp_glyph(base_img, center, radius):
    """Simple flat WhatsApp-style handset glyph on a green circle (no external icon asset needed)."""
    draw = ImageDraw.Draw(base_img)
    cx, cy = center
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=WHATSAPP_GREEN)
    r = radius * 0.55
    draw.arc([cx - r, cy - r, cx + r, cy + r], start=20, end=320, fill=WHITE, width=int(radius * 0.14))
    draw.ellipse([cx + r * 0.55, cy + r * 0.55, cx + r * 0.55 + radius * 0.22, cy + r * 0.55 + radius * 0.22],
                 fill=WHITE)


def fit_product_photo(photo_path, target_h):
    img = Image.open(photo_path).convert("RGBA")
    w, h = img.size
    scale = target_h / h
    return img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)


def wrap_text(draw, text, font, max_width):
    """Greedy word-wrap so text never overflows max_width, honoring explicit newlines."""
    lines = []
    for paragraph in text.split("\n"):
        words = paragraph.split(" ")
        current = ""
        for word in words:
            trial = f"{current} {word}".strip()
            if draw.textbbox((0, 0), trial, font=font)[2] <= max_width or not current:
                current = trial
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def render_card(
    product_photo_path,
    logo_path,
    font_bold_path,      # Poppins-ExtraBold.ttf
    font_regular_path,   # Poppins-Bold.ttf
    headline_prefix,     # e.g. "Looking for"
    product_name,        # e.g. "Rexroth A10VO Pumps"
    highlight_phrase,    # e.g. "at unbeatable pricing?"
    subhead,             # e.g. "Contact SKS Hydraulics Africa."
    bullets,             # list[str], e.g. ["Local Stock", "Jet Park, Boksburg"]
    whatsapp_number,     # e.g. "076 165 0400"
    output_path,
    cta_subtext="for Quick Responses",
):
    canvas = Image.new("RGB", (CANVAS, CANVAS), BLACK)

    # subtle hex texture over the whole background
    tex = hex_pattern(CANVAS, fg=(255, 255, 255), alpha=10, cell=90)
    canvas = Image.alpha_composite(canvas.convert("RGBA"), tex)

    # product photo, left side, bleeding to bottom edge
    product = fit_product_photo(product_photo_path, int(CANVAS * 0.62))
    px = int(CANVAS * 0.02)
    py = CANVAS - product.height + int(CANVAS * 0.04)
    canvas.alpha_composite(product, (px, py))

    draw = ImageDraw.Draw(canvas)

    # round logo, top-right
    logo = Image.open(logo_path).convert("RGBA")
    logo_size = int(CANVAS * 0.155)
    logo = logo.resize((logo_size, logo_size), Image.LANCZOS)
    lx = CANVAS - logo_size - int(CANVAS * 0.045)
    ly = int(CANVAS * 0.045)
    canvas.alpha_composite(logo, (lx, ly))

    # headline block -- right column, below the logo
    text_x = int(CANVAS * 0.50)
    text_y = int(CANVAS * 0.27)
    right_margin = int(CANVAS * 0.045)
    max_width = CANVAS - text_x - right_margin
    headline_font = ImageFont.truetype(font_bold_path, int(CANVAS * 0.046))

    def draw_wrapped(text, font, xy, fill, line_spacing=1.18):
        x, y = xy
        for line in wrap_text(draw, text, font, max_width):
            draw.text((x, y), line, font=font, fill=fill)
            y += int(font.size * line_spacing)
        return y

    y = draw_wrapped(f"{headline_prefix} {product_name}", headline_font, (text_x, text_y), WHITE)
    y += int(CANVAS * 0.008)
    y = draw_wrapped(highlight_phrase.replace("\n", " "), headline_font, (text_x, y), GOLD)

    y += int(CANVAS * 0.025)
    subhead_font = ImageFont.truetype(font_regular_path, int(CANVAS * 0.030))
    y = draw_wrapped(subhead, subhead_font, (text_x, y), WHITE)

    y += int(CANVAS * 0.02)
    bullet_font = ImageFont.truetype(font_regular_path, int(CANVAS * 0.030))
    marker_size = int(CANVAS * 0.014)
    for b in bullets:
        my = y + int(bullet_font.size * 0.28)
        draw.polygon(
            [(text_x, my), (text_x, my + marker_size), (text_x + marker_size, my + marker_size / 2)],
            fill=GOLD,
        )
        draw.text((text_x + marker_size * 2, y), b, font=bullet_font, fill=WHITE)
        y += int(bullet_font.size * 1.5)

    # WhatsApp CTA, bottom of the text column
    cta_y = int(CANVAS * 0.86)
    radius = int(CANVAS * 0.035)
    draw_whatsapp_glyph(canvas, (text_x + radius, cta_y + radius), radius)
    cta_font = ImageFont.truetype(font_bold_path, int(CANVAS * 0.026))
    draw.text((text_x + radius * 2 + int(CANVAS * 0.02), cta_y + int(radius * 0.25)),
              f"WhatsApp: {whatsapp_number}", font=cta_font, fill=GOLD)
    sub_font = ImageFont.truetype(font_regular_path, int(CANVAS * 0.022))
    draw.text((text_x + radius * 2 + int(CANVAS * 0.02), cta_y + int(radius * 1.15)),
              cta_subtext, font=sub_font, fill=WHITE)

    canvas.convert("RGB").save(output_path, quality=95)
    print(f"Saved {output_path}")


if __name__ == "__main__":
    # Example usage -- swap paths for your local copies of the backed-up assets.
    base = os.path.dirname(__file__)
    render_card(
        product_photo_path="K3V63DT-composited.png",   # Higgsfield marketing_studio_image output
        logo_path="SKS-Official-Logo.png",
        font_bold_path="Poppins-ExtraBold.ttf",
        font_regular_path="Poppins-Bold.ttf",
        headline_prefix="Looking for",
        product_name="Vickers K3V63DT Vane Pumps or Spares",
        highlight_phrase="at unbeatable pricing?",
        subhead="Contact SKS Hydraulics Africa.",
        bullets=["Local Stock", "Jet Park, Boksburg"],
        whatsapp_number="076 165 0400",
        output_path="test_render_k3v63dt.jpg",
    )
