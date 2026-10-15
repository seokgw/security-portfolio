from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / "docs" / "evidence"
OUT.mkdir(parents=True, exist_ok=True)
FONT = ImageFont.truetype("C:/Windows/Fonts/malgunbd.ttf", 72)
SPECS = [
    ("sample-square.png", (1080, 1080), (14, 47, 76), (20, 116, 122), "오늘도 한 걸음"),
    ("sample-feed.png", (1080, 1350), (62, 38, 79), (176, 91, 83), "작은 순간을 기록해요"),
    ("sample-story.png", (1080, 1920), (18, 57, 76), (186, 133, 62), "나답게, 더 멀리"),
]

for filename, (width, height), start, end, text in SPECS:
    image = Image.new("RGB", (width, height))
    pixels = image.load()
    for y in range(height):
        mix = y / max(height - 1, 1)
        color = tuple(round(a * (1 - mix) + b * mix) for a, b in zip(start, end))
        for x in range(width):
            pixels[x, y] = color
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((70, 70, width - 70, height - 70), radius=40, outline="white", width=5)
    draw.text((width / 2, height * .72), text, font=FONT, anchor="mm", fill="white", stroke_width=3, stroke_fill="#000000")
    image.save(OUT / filename, format="PNG", optimize=True)
