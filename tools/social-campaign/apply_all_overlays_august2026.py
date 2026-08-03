# Historical record: the exact headline/tagline pairs used for the August 2026
# calendar (17 posting days). Import path below assumes brand_overlay.py sits
# alongside this file (as it does in this repo) — adjust if run standalone.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from brand_overlay import apply_overlay

D = r"C:\Users\info\Desktop\SDLG August\Ready for Brandflow\By Date"

POSTS = [
    ("2026-08-03.jpg", "SDLG", "Precision Engineering"),
    ("2026-08-04.jpg", "E660FEV", "Electric. Reliable."),
    ("2026-08-06.jpg", "Genuine Parts", "Built To Perform"),
    ("2026-08-07.jpg", "RS7220H", "Reliability In Action"),
    ("2026-08-10.jpg", "SDLG", "Efficiency First"),
    ("2026-08-11.jpg", "L918", "Reliability In Action"),
    ("2026-08-13.jpg", "Service Support", "Uptime, Guaranteed"),
    ("2026-08-14.jpg", "B877F", "Reliability In Action"),
    ("2026-08-17.jpg", "SDLG", "From Factory To Site"),
    ("2026-08-18.jpg", "E660FEV", "Lower Costs. Zero Emissions."),
    ("2026-08-20.jpg", "L9100H", "Reliability In Action"),
    ("2026-08-21.jpg", "LFT18H", "Reliability In Action"),
    ("2026-08-24.jpg", "SDLG", "Building A Century"),
    ("2026-08-25.jpg", "D18H", "Reliability In Action"),
    ("2026-08-27.jpg", "SR900H", "Reliability In Action"),
    ("2026-08-28.jpg", "Dealer Network", "Support You Can Trust"),
    ("2026-08-31.jpg", "SDLG", "Built To Last"),
]

for fname, headline, tagline in POSTS:
    src = f"{D}\\{fname}"
    apply_overlay(src, headline, tagline, src)  # overwrite in place
