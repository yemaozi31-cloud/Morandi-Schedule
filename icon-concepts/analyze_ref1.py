from PIL import Image

# Analyze first reference image (the 536x499 one)
img = Image.open("D:/Create/Schedule/icon-concepts/ref-image.png").convert("RGB")
w, h = img.size
print(f"=== First reference ({w}x{h}) ===")

# Layout grid
cols, rows = 4, 4
cell_w, cell_h = w//cols, h//rows
print("Layout grid:")
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

# Center vertical samples
print("\nCenter vertical (x=268):")
for y in range(0, h, 20):
    c = img.getpixel((268, y))
    print(f"  y={y}: RGB{c}")

# Dominant colors
small = img.resize((50,50))
pal = small.quantize(colors=8).convert("RGB")
import collections
counter = collections.Counter(list(pal.getdata()))
print("\nDominant colors:")
for color, count in counter.most_common(8):
    print(f"  #{color[0]:02x}{color[1]:02x}{color[2]:02x}: {100*count/2500:.1f}%")
