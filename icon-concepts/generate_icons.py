from PIL import Image
import os

base = Image.open("D:/Create/Schedule/icon-concepts/icon-1024.png")
outdir = "D:/Create/Schedule/src-tauri/icons"
os.makedirs(outdir, exist_ok=True)

# === PNG sizes for Tauri ===
sizes = {
    "icon.png": 1024,
    "128x128@2x.png": 256,
    "128x128.png": 128,
    "32x32.png": 32,
}

for name, size in sizes.items():
    img = base.resize((size, size), Image.LANCZOS)
    path = os.path.join(outdir, name)
    img.save(path, "PNG")
    print(f"  {name} ({size}x{size}) -> {os.path.getsize(path)} bytes")

# === ICO (Windows) - Multi-resolution ===
# ICO should contain: 16, 24, 32, 48, 64, 128, 256
ico_sizes = [16, 24, 32, 48, 64, 128, 256]
ico_path = os.path.join(outdir, "icon.ico")
ico_images = []
for s in ico_sizes:
    ico_images.append(base.resize((s, s), Image.LANCZOS))
# Save as ICO - first image's size sets the default display size
ico_images[0].save(
    ico_path,
    "ICO",
    sizes=[(s, s) for s in ico_sizes],
    append_images=ico_images[1:]
)
print(f"  icon.ico (multi-res: {ico_sizes}) -> {os.path.getsize(ico_path)} bytes")

# === ICNS (macOS) - Requires specific sizes ===
# macOS requires: 16, 32, 64, 128, 256, 512, 1024
icns_path = os.path.join(outdir, "icon.icns")
icns_sizes = [16, 32, 64, 128, 256, 512, 1024]
icns_images = []
for s in icns_sizes:
    icns_images.append(base.resize((s, s), Image.LANCZOS))
try:
    icns_images[0].save(
        icns_path,
        "ICNS",
        append_images=icns_images[1:]
    )
    print(f"  icon.icns -> {os.path.getsize(icns_path)} bytes")
except Exception as e:
    print(f"  icon.icns FAILED: {e}")
    # ICNS may need special handling on Windows

print("\nDone! All icons generated.")
