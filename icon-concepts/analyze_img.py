from PIL import Image
import collections

img = Image.open("D:/Create/Schedule/icon-concepts/gemini-ref.png").convert("RGB")
print(f"Size: {img.size}")

# Dominant colors
small = img.copy()
pal = small.quantize(colors=10)
pal_img = pal.convert("RGB")
colors = list(pal_img.getdata())
counter = collections.Counter(colors)
print("Top 10 colors:")
for c, cnt in counter.most_common(10):
    print(f"  #{c[0]:02x}{c[1]:02x}{c[2]:02x}: {cnt} ({100*cnt/len(colors):.1f}%)")

# Layout grid
w, h = img.size
cols, rows = 6, 4
cell_w, cell_h = w//cols, h//rows
print(f"\nLayout grid ({cols}x{rows}):")
for r in range(rows):
    row_colors = []
    for c in range(cols):
        avg_r, avg_g, avg_b, n = 0,0,0,0
        for y in range(r*cell_h, (r+1)*cell_h):
            for x in range(c*cell_w, (c+1)*cell_w):
                r_,g_,b_ = img.getpixel((x,y))
                avg_r+=r_; avg_g+=g_; avg_b+=b_; n+=1
        avg_r//=n; avg_g//=n; avg_b//=n
        row_colors.append(f"#{avg_r:02x}{avg_g:02x}{avg_b:02x}")
    print(f"  Row {r}: {'  '.join(row_colors)}")

# Contrast analysis
contrast_map = img.resize((100, 100)).convert("L")
high_contrast = 0
for y in range(99):
    for x in range(99):
        px = contrast_map.getpixel((x,y))
        px_r = contrast_map.getpixel((min(x+2,99), y))
        px_d = contrast_map.getpixel((x, min(y+2,99)))
        if abs(int(px)-int(px_r)) > 60 or abs(int(px)-int(px_d)) > 60:
            high_contrast += 1
total = 99*99
print(f"\nHigh contrast pixels: {high_contrast}/{total} ({100*high_contrast/total:.1f}%)")

# Corner and center analysis
corners = {
    "top-left": img.getpixel((10,10)),
    "top-right": img.getpixel((w-10,10)),
    "bottom-left": img.getpixel((10,h-10)),
    "bottom-right": img.getpixel((w-10,h-10)),
}
center = img.getpixel((w//2, h//2))
print(f"\nCorners: {corners}")
print(f"Center: RGB{center}")

# Edge detection - horizontal lines (calendar lines?)
edges_h = 0
for y in range(h):
    for x in range(w-1):
        if abs(int(img.getpixel((x,y))[0]) - int(img.getpixel((x+1,y))[0])) > 80:
            edges_h += 1
            break
print(f"\nRows with horizontal edges: {edges_h}/{h}")

# Sample vertical center line
print("\nVertical center line samples (every 50px):")
for y in range(0, h, 50):
    c = img.getpixel((w//2, y))
    print(f"  y={y}: RGB{c}")
