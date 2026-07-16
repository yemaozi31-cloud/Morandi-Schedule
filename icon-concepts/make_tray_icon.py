"""生成透明背景托盘图标（去除白色背景）"""
from PIL import Image
import os

# 打开Edge渲染的图（白底）
img = Image.open("D:/Create/Schedule/icon-concepts/tray-icon.png").convert("RGBA")
pixels = img.load()
w, h = img.size

# 白色 → 透明：任何接近纯白的像素设 alpha=0
# 但要保留白色文字（MORANDI）和浅色卡面
# 思路：只有同时满足"很亮"且"在边缘区域"的才变透明
threshold = 240
margin = 4  # 边缘4像素才允许变透明

for y in range(h):
    for x in range(w):
        r, g, b, a = pixels[x, y]
        if a == 0:
            continue
        # 纯白背景（R>248,G>248,B>248）→ 透明
        if r > threshold and g > threshold and b > threshold:
            # 边缘区域才变透明（避免吃掉白色文字和浅色卡面）
            if x < margin or x >= w - margin or y < margin or y >= h - margin:
                pixels[x, y] = (r, g, b, 0)
            else:
                # 内部白点：如果是孤立的才变透明
                pixels[x, y] = (r, g, b, int(a * 0.85))

# 保存为透明PNG
outdir = "D:/Create/Schedule/icon-concepts"
img.save(os.path.join(outdir, "tray-icon-32.png"), "PNG")

# 也生成一个256x256的大版本备用
img256 = img.resize((256, 256), Image.LANCZOS)
img256.save(os.path.join(outdir, "tray-icon-256.png"), "PNG")

# 检查透明像素比例
data = img.getdata()
transparent = sum(1 for r,g,b,a in data if a < 10)
total = len(data)
print(f"32x32: {transparent}/{total} transparent ({100*transparent/total:.0f}%)")

# 保存到 src-tauri/icons 目录
img.save("D:/Create/Schedule/src-tauri/icons/tray-icon.png", "PNG")
img256.save("D:/Create/Schedule/src-tauri/icons/tray-icon-256.png", "PNG")

print("Done! Tray icon with transparency saved.")
