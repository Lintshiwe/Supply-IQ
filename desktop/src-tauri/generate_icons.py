#!/usr/bin/env python3
"""Generate placeholder PNG icons for Tauri"""
import struct, zlib, os

def create_png(width, height, r=15, g=23, b=42):
    """Create a solid-color PNG"""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    hdr = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0))
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            raw += bytes([r, g, b])
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return hdr + ihdr + idat + iend

os.makedirs('icons', exist_ok=True)
os.chdir('icons')

sizes = [(32, 32, '32x32.png'), (128, 128, '128x128.png'), (256, 256, '128x128@2x.png')]
for w, h, name in sizes:
    with open(name, 'wb') as f:
        f.write(create_png(w, h))

# Create .ico and .icns from 32x32
import shutil
shutil.copy('32x32.png', 'icon.ico')
shutil.copy('128x128.png', 'icon.icns')

print("Icons created:")
for f in sorted(os.listdir('.')):
    print(f"  {f} ({os.path.getsize(f)} bytes)")
