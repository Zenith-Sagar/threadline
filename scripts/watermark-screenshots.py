#!/usr/bin/env python3
"""Write SI-watermarked copies of the submission screenshots.

Why: the Space Apps Project Submission Guide (13 Nov 2026, "Use of Super Intelligence (SI)") says images and videos
must include a visible watermark to indicate SI generation. The game's screenshots are renders of SI-assisted code,
so the copies meant for upload (and for the demo deck) carry a visible line. The line sits in a strip added BELOW the
screenshot, so it never covers a label such as GAME MODEL. The originals are left untouched.

    python3 scripts/watermark-screenshots.py

Reads  submission/screenshots/*.png
Writes submission/screenshots-si/*.png  (same names; 36 px taller than the original because of the strip)
Needs  Pillow.
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

TEXT = "Built with SI assistance (Claude, Anthropic)"
SRC = Path("submission/screenshots")
DST = Path("submission/screenshots-si")
FONTS = [
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def load_font(size: int) -> ImageFont.ImageFont:
    for f in FONTS:
        try:
            return ImageFont.truetype(f, size)
        except OSError:
            continue
    return ImageFont.load_default()


def stamp(src: Path, dst: Path) -> None:
    img = Image.open(src).convert("RGB")
    w, h = img.size
    strip = round(h * 0.05)
    out = Image.new("RGB", (w, h + strip), (11, 16, 32))
    out.paste(img, (0, 0))
    d = ImageDraw.Draw(out)
    d.line((0, h, w, h), fill=(77, 216, 255), width=2)
    font = load_font(round(strip * 0.55))
    box = d.textbbox((0, 0), TEXT, font=font)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((w - tw) // 2 - box[0], h + (strip - th) // 2 - box[1]), TEXT, font=font, fill=(255, 255, 255))
    out.save(dst, "PNG", optimize=True)


def main() -> int:
    files = sorted(SRC.glob("*.png"))
    if not files:
        print(f"no PNG files in {SRC}", file=sys.stderr)
        return 1
    DST.mkdir(parents=True, exist_ok=True)
    for f in files:
        stamp(f, DST / f.name)
        print(f"{DST / f.name}  ({(DST / f.name).stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
