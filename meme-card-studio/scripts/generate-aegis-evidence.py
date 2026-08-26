from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SOURCE = Path(r"C:\Users\Administrator\Downloads\AEGIS 팀 로고.png")
OUT = Path(__file__).resolve().parents[1] / "docs" / "evidence" / "aegis"
FONT_PATH = "C:/Windows/Fonts/malgunbd.ttf"
SPECS = [
    ("aegis-square-1x1.png", (1080, 1080), "AEGIS TEAM\n안전한 연결의 시작", 58, "#ffffff", .78),
    ("aegis-feed-4x5.png", (1080, 1350), "기술로 지키고\n신뢰로 연결합니다", 60, "#d9f3ff", .76),
    ("aegis-story-9x16.png", (1080, 1920), "SECURE TODAY\nREADY FOR TOMORROW", 56, "#71cfff", .80),
]

source = Image.open(SOURCE).convert("RGB")
for filename, (width, height), text, font_size, color, y_ratio in SPECS:
    scale = max(width / source.width, height / source.height)
    resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
    left = (resized.width - width) // 2
    top = (resized.height - height) // 2
    image = resized.crop((left, top, left + width, top + height))
    overlay = Image.new("RGBA", image.size, (3, 9, 20, 55))
    image = Image.alpha_composite(image.convert("RGBA"), overlay)
    draw = ImageDraw.Draw(image)
    font = ImageFont.truetype(FONT_PATH, font_size)
    lines = text.split("\n")
    line_height = round(font_size * 1.25)
    center_y = round(height * y_ratio)
    first_y = center_y - round((len(lines) - 1) * line_height / 2)
    for index, line in enumerate(lines):
        draw.text((width / 2, first_y + index * line_height), line, font=font, anchor="mm", fill=color, stroke_width=3, stroke_fill="#000000")
    image.convert("RGB").save(OUT / filename, format="PNG", optimize=True)
