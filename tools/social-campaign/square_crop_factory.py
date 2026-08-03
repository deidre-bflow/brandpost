import os
from PIL import Image

D = r"C:\Users\info\Desktop\SDLG August\Ready for Brandflow\By Date"
FACTORY_FILES = ["2026-08-03.jpg", "2026-08-10.jpg", "2026-08-17.jpg", "2026-08-24.jpg", "2026-08-31.jpg"]

for fname in FACTORY_FILES:
    path = os.path.join(D, fname)
    img = Image.open(path).convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    cropped = img.crop((left, top, left + side, top + side))
    # upscale back to 2048x2048 if the crop came out smaller than that
    if cropped.size[0] != 2048:
        cropped = cropped.resize((2048, 2048), Image.LANCZOS)
    cropped.save(path, "JPEG", quality=92)
    print(f"{fname}: cropped to {cropped.size}")
