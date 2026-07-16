"""更新所有遗漏的图标文件"""
from PIL import Image, ImageDraw
import os, math

base_1024 = Image.open("D:/Create/Schedule/icon-concepts/icon-1024.png").convert("RGBA")

def create_squircle_mask(size, rx_ratio=0.22):
    """Create a squircle (Apple-style rounded rect) mask"""
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    rx = int(size * rx_ratio)
    draw.rounded_rectangle([(0, 0), (size, size)], radius=rx, fill=255)
    return mask

def create_foreground(img, target_size):
    """Create foreground: icon with outer bg made transparent via squircle mask"""
    resized = img.resize((target_size, target_size), Image.LANCZOS)
    mask = create_squircle_mask(target_size)
    fg = Image.new("RGBA", (target_size, target_size), (0, 0, 0, 0))
    fg.paste(resized, (0, 0), mask)
    return fg

# Android configs
configs = {
    "mdpi":   {"size": 48,  "fg_size": 108},
    "hdpi":   {"size": 72,  "fg_size": 162},
    "xhdpi":  {"size": 96,  "fg_size": 216},
    "xxhdpi": {"size": 144, "fg_size": 324},
    "xxxhdpi":{"size": 192, "fg_size": 432},
}

android_res = "D:/Create/Schedule/src-tauri/gen/android/app/src/main/res"

for density, cfg in configs.items():
    d = os.path.join(android_res, f"mipmap-{density}")

    # ic_launcher.png & ic_launcher_round.png: full icon
    s = cfg["size"]
    img = base_1024.resize((s, s), Image.LANCZOS)
    img.save(os.path.join(d, "ic_launcher.png"), "PNG")
    img.save(os.path.join(d, "ic_launcher_round.png"), "PNG")

    # ic_launcher_foreground.png: content on transparent
    fs = cfg["fg_size"]
    fg = create_foreground(base_1024, fs)
    fg.save(os.path.join(d, "ic_launcher_foreground.png"), "PNG")

    print(f"  mipmap-{density}: {s}x{s} + fg {fs}x{fs} ✓")

# Build cache icon.ico
cache_ico = "D:/Create/Schedule/src-tauri/target/release/resources/icon.ico"
os.makedirs(os.path.dirname(cache_ico), exist_ok=True)
with open("D:/Create/Schedule/src-tauri/icons/icon.ico", "rb") as src:
    with open(cache_ico, "wb") as dst:
        dst.write(src.read())
print(f"\n  构建缓存 icon.ico ✓")
print("全部更新完成！")
