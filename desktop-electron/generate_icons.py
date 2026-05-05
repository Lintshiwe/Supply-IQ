#!/usr/bin/env python3
"""Generate icons - optimized"""
import struct, zlib, os, shutil

def create_png(width, height):
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    hdr = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    
    rows = []
    cx, cy = width * 0.5, height * 0.5
    bw, bh = width * 0.32, height * 0.32
    for y in range(height):
        row = b'\x00'
        for x in range(width):
            in_box = abs(x - cx) < bw and abs(y - cy + height * 0.06) < bh
            row += b'\x84\xcc\x16\xff' if in_box else b'\x0f\x17\x2a\xff'
        rows.append(row)
    
    idat = chunk(b'IDAT', zlib.compress(b''.join(rows)))
    iend = chunk(b'IEND', b'')
    return hdr + ihdr + idat + iend

os.makedirs('assets', exist_ok=True)

# Build just the essential sizes - fast
for w in [32, 48, 128, 256]:
    name = f'icon.png' if w == 256 else f'icon-{w}.png'
    with open(f'assets/{name}', 'wb') as f:
        f.write(create_png(w, w))
    print(f"  {name} ({w}x{w})")

# 512
with open('assets/icon@2x.png', 'wb') as f:
    f.write(create_png(512, 512))
print("  icon@2x.png (512x512)")

# Copy for .ico and .icns
shutil.copy('assets/icon.png', 'assets/icon.ico')
shutil.copy('assets/icon.png', 'assets/icon.icns')
print("  icon.ico, icon.icns — done")
