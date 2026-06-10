"""Generate the 1200x630 Open Graph card for apurwa.github.io.

Matches the site palette in styles.css. Re-run after changing the
headline, title line, or profile photo:  python3 assets/generate_og_image.py
"""

from PIL import Image, ImageDraw, ImageFont, ImageOps

W, H = 1200, 630
BG = "#f7efcf"
FG = "#1f211b"
MUTED = "#6f653b"
ACCENT = "#9d0006"
GRID = (125, 106, 43, 20)  # faint warm grid like the site background

ASSETS = __file__.rsplit("/", 1)[0]

img = Image.new("RGB", (W, H), BG)
draw = ImageDraw.Draw(img, "RGBA")

# Faint 52px grid, same rhythm as the site background
for x in range(0, W, 52):
    draw.line([(x, 0), (x, H)], fill=GRID, width=1)
for y in range(0, H, 52):
    draw.line([(0, y), (W, y)], fill=GRID, width=1)

def font(size, bold=False):
    # Menlo stands in for Geist Mono (not installed locally)
    return ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", size, index=1 if bold else 0)

# Circular profile photo, left side
P = 240
photo = Image.open(f"{ASSETS}/profile.jpg").convert("RGB")
photo = ImageOps.fit(photo, (P, P))
mask = Image.new("L", (P * 4, P * 4), 0)
ImageDraw.Draw(mask).ellipse([0, 0, P * 4, P * 4], fill=255)
mask = mask.resize((P, P))
px, py = 100, (H - P) // 2
draw.ellipse([px - 5, py - 5, px + P + 5, py + P + 5], outline=ACCENT, width=4)
img.paste(photo, (px, py), mask)

# Text block
tx = px + P + 70
draw.text((tx, 185), "Apurwa Sarwajit", font=font(58, bold=True), fill=FG)
draw.text((tx, 270), "AI Product Lead", font=font(34), fill=ACCENT)
draw.text((tx, 325), "Browser agents and AI products", font=font(26), fill=MUTED)
draw.text((tx, 365), "for banks and enterprises", font=font(26), fill=MUTED)

draw.line([(tx, 425), (tx + 620, 425)], fill="#d7c783", width=2)
draw.text((tx, 445), "apurwa.github.io", font=font(24), fill=MUTED)

img.save(f"{ASSETS}/og-image.png", optimize=True)
print("wrote assets/og-image.png")
