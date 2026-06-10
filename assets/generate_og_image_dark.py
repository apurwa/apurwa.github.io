"""Generate a dark hero-styled OG card variant (1200x630).

Mimics the scroll hero: the name as a field of bone-colored particle dots
with ember accents on deep ink. Run: python3 assets/generate_og_image_dark.py
Not wired into index.html unless chosen over the cream card.
"""

import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1200, 630
INK = (18, 19, 14)
BONE = (217, 210, 187)
EMBER = (169, 80, 74)
MUTED = (140, 133, 110)

random.seed(7)

ASSETS = __file__.rsplit("/", 1)[0]

def font(size, bold=False):
    return ImageFont.truetype("/System/Library/Fonts/Menlo.ttc", size, index=1 if bold else 0)

# sample the name into particle positions
mask = Image.new("L", (W, H), 0)
md = ImageDraw.Draw(mask)
md.text((W // 2, 200), "APURWA", font=font(120, bold=True), fill=255, anchor="mm")
md.text((W // 2, 330), "SARWAJIT", font=font(120, bold=True), fill=255, anchor="mm")
mpx = mask.load()

img = Image.new("RGB", (W, H), INK)
draw = ImageDraw.Draw(img)

# ambient dust behind everything
for _ in range(220):
    x, y = random.uniform(0, W), random.uniform(0, H)
    r = random.uniform(0.7, 1.8)
    c = EMBER if random.random() < 0.06 else (90, 86, 70)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

# glow layer: name dots drawn large and blurred
glow = Image.new("RGB", (W, H), (0, 0, 0))
gd = ImageDraw.Draw(glow)
pts = []
for y in range(0, H, 4):
    for x in range(0, W, 4):
        if mpx[x, y] > 100 and random.random() < 0.85:
            pts.append((x + random.uniform(-1.5, 1.5), y + random.uniform(-1.5, 1.5)))
for x, y in pts:
    gd.ellipse([x - 3.4, y - 3.4, x + 3.4, y + 3.4], fill=(96, 88, 64))
glow = glow.filter(ImageFilter.GaussianBlur(7))
img = Image.composite(Image.blend(img, Image.new("RGB", (W, H), BONE), 0.55), img, glow.convert("L"))
draw = ImageDraw.Draw(img)

# crisp particle dots on top
for x, y in pts:
    r = random.uniform(1.1, 2.1)
    c = EMBER if random.random() < 0.05 else BONE
    draw.ellipse([x - r, y - r, x + r, y + r], fill=c)

# caption block, like the hero's DOM captions
draw.text((W // 2, 432), "AI PRODUCT LEAD — BROWSER AGENTS", font=font(26), fill=BONE, anchor="mm")
draw.line([(W // 2 - 180, 470), (W // 2 + 180, 470)], fill=(60, 57, 45), width=2)
draw.text((W // 2, 502), "apurwa.github.io", font=font(22), fill=MUTED, anchor="mm")

img.save(f"{ASSETS}/og-image-dark.png", optimize=True)
print("wrote assets/og-image-dark.png")
