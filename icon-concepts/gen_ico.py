from PIL import Image
import struct
import io

base = Image.open("D:/Create/Schedule/icon-concepts/icon-1024.png")
ico_path = "D:/Create/Schedule/src-tauri/icons/icon.ico"

# Sizes for ICO
sizes = [16, 24, 32, 48, 64, 128, 256]

# Generate PNG data for each size
png_datas = []
for s in sizes:
    img = base.resize((s, s), Image.LANCZOS)
    buf = io.BytesIO()
    img.save(buf, "PNG")
    png_datas.append(buf.getvalue())

# Build ICO file
# Header: reserved(2) + type(2=ICO) + count(2)
header = struct.pack("<HHH", 0, 1, len(sizes))

# Directory entries + image data
offset = 6 + len(sizes) * 16
entries = b""
data = b""
for i, (s, png) in enumerate(zip(sizes, png_datas)):
    # Directory entry: w, h, colors, reserved, planes, bpp, size, offset
    w = s if s < 256 else 0
    h = s if s < 256 else 0
    entries += struct.pack("<BBBBHHII", w, h, 0, 0, 1, 32, len(png), offset)
    data += png
    offset += len(png)

with open(ico_path, "wb") as f:
    f.write(header + entries + data)

# Verify
import os
print(f"ICO saved: {os.path.getsize(ico_path)} bytes")

# Verify by reading back
ico = Image.open(ico_path)
print(f"Frames: {ico.n_frames if hasattr(ico, 'n_frames') else 'unknown'}")
for i in range(min(7, getattr(ico, 'n_frames', 1))):
    ico.seek(i)
    print(f"  Frame {i}: {ico.size}")
