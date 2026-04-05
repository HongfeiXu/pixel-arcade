"""生成 iOS PWA 启动画面：#1A1A2E 背景 + 居中棋盘格图标 + 像素游戏厅文字"""

from PIL import Image, ImageDraw, ImageFont
import os

# 目标设备分辨率 (width, height, scale, filename_suffix)
DEVICES = [
    (1320, 2868, 3, "1320x2868"),  # iPhone 16 Pro Max
    (1206, 2622, 3, "1206x2622"),  # iPhone 16 Pro
    (1170, 2532, 3, "1170x2532"),  # iPhone 16/15
    (1284, 2778, 3, "1284x2778"),  # iPhone 15 Plus/14 Pro Max
    (1179, 2556, 3, "1179x2556"),  # iPhone 14 Pro
    (750, 1334, 2, "750x1334"),    # iPhone SE
]

BG_COLOR = (0x1A, 0x1A, 0x2E)
TEXT_COLOR = (0xFF, 0xD6, 0x00)  # 主强调黄
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
TEXT = "像素游戏厅"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
ICONS_DIR = os.path.join(PROJECT_DIR, "public", "icons")
ICON_PATH = os.path.join(ICONS_DIR, "icon-512.png")
OUTPUT_DIR = os.path.join(ICONS_DIR, "splash")

os.makedirs(OUTPUT_DIR, exist_ok=True)

icon_orig = Image.open(ICON_PATH).convert("RGBA")

for w, h, scale, suffix in DEVICES:
    img = Image.new("RGB", (w, h), BG_COLOR)
    draw = ImageDraw.Draw(img)

    # 图标大小：短边的 40%
    icon_size = int(min(w, h) * 0.40)
    icon = icon_orig.resize((icon_size, icon_size), Image.NEAREST)

    # 图标居中偏上
    icon_x = (w - icon_size) // 2
    icon_y = (h - icon_size) // 2 - int(h * 0.06)
    img.paste(icon, (icon_x, icon_y), icon)

    # 文字在图标下方
    font_size = int(icon_size * 0.22)
    font = ImageFont.truetype(FONT_PATH, font_size)
    bbox = font.getbbox(TEXT)
    text_w = bbox[2] - bbox[0]
    text_x = (w - text_w) // 2
    text_y = icon_y + icon_size + int(h * 0.03)
    draw.text((text_x, text_y), TEXT, fill=TEXT_COLOR, font=font)

    out_path = os.path.join(OUTPUT_DIR, f"splash-{suffix}.png")
    img.save(out_path, "PNG")
    print(f"  {suffix}: {out_path}")

print(f"\n生成完成，共 {len(DEVICES)} 张启动图")
