"""生成真正透明的托盘图标：去掉白色背景，保留内容alpha通道"""
from PIL import Image
import os

# 打开Edge渲染的图（白底，512x512）
img = Image.open("D:/Create/Schedule/icon-concepts/tray-raw.png").convert("RGBA")
pixels = img.load()
w, h = img.size

# ===== 策略：flood-fill 从角点找连通白色区域 =====
# 简单实现：标记所有白色像素，用BFS从角点找连通区域
from collections import deque

WHITE_THRESHOLD = 245  # 纯白阈值
visited = set()
bg_pixels = set()

# 从四个角出发做BFS
start_points = [(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)]
queue = deque()

for sp in start_points:
    if sp not in visited:
        r, g, b, a = pixels[sp]
        if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
            queue.append(sp)
            visited.add(sp)

# 4邻域BFS
while queue:
    x, y = queue.popleft()
    bg_pixels.add((x, y))
    for dx, dy in [(0,1),(1,0),(0,-1),(-1,0)]:
        nx, ny = x+dx, y+dy
        if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
            r, g, b, a = pixels[nx, ny]
            if r > WHITE_THRESHOLD and g > WHITE_THRESHOLD and b > WHITE_THRESHOLD:
                visited.add((nx, ny))
                queue.append((nx, ny))

# 将连通白色背景设为透明
for x, y in bg_pixels:
    pixels[x, y] = (0, 0, 0, 0)

# 检查透明度比例
transparent = sum(1 for y in range(h) for x in range(w) if pixels[x, y][3] < 10)
total = w * h
print(f"512x512: 透明像素 {transparent}/{total} ({100*transparent/total:.0f}%)")

# 保存512x512透明版
img.save("D:/Create/Schedule/icon-concepts/tray-transparent-512.png", "PNG")

# 缩放到256x256和32x32
img256 = img.resize((256, 256), Image.LANCZOS)
img256.save("D:/Create/Schedule/src-tauri/icons/tray-icon-256.png", "PNG")

img32 = img.resize((32, 32), Image.LANCZOS)
img32.save("D:/Create/Schedule/src-tauri/icons/tray-icon.png", "PNG")

# 验证32x32透明度
data32 = img32.getdata()
trans32 = sum(1 for r,g,b,a in data32 if a < 10)
print(f"32x32: 透明像素 {trans32}/{32*32} ({100*trans32/(32*32):.0f}%)")

# 检查非透明区域颜色
non_trans = [(r,g,b) for r,g,b,a in data32 if a > 200]
if non_trans:
    avg_r = sum(c[0] for c in non_trans) // len(non_trans)
    avg_g = sum(c[1] for c in non_trans) // len(non_trans)
    avg_b = sum(c[2] for c in non_trans) // len(non_trans)
    print(f"非透明像素平均色: RGB({avg_r},{avg_g},{avg_b}) 共{len(non_trans)}个")

print("Done! 透明托盘图标已生成")
