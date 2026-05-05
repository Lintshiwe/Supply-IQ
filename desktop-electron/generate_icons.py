#!/usr/bin/env python3
"""Generate a proper PNG icon for the Electron app"""
import struct, zlib, os

def create_png(width, height):
    """Create a SupplyIQ-branded dark PNG with green accent"""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    hdr = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))
    
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte
        for x in range(width):
            # Center area is darker (the "box"), edges are dark bg
            cx, cy = width//2, height//2
            dx, dy = abs(x - cx) / cx, abs(y - cy) / cy
            if dx < 0.4 and dy < 0.5:
                r, g, b = 132, 204, 22  # Green accent (#84cc16)
            elif dx < 0.6 and dy < 0.4:
                r, g, b = 15, 23, 42  # Dark bg
            else:
                r, g, b = 15, 23, 42  # Dark bg
            raw += bytes([r, g, b, 255])
    
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return hdr + ihdr + idat + iend

os.makedirs('assets', exist_ok=True)
for size, name in [(256, 'icon.png'), (512, 'icon@2x.png')]:
    with open(f'assets/{name}', 'wb') as f:
        f.write(create_png(size, size))
    print(f"Created assets/{name} ({size}x{size})")

# Create .ico (just copy for now)
import shutil
shutil.copy('assets/icon.png', 'assets/icon.ico')
shutil.copy('assets/icon.png', 'assets/icon.icns')
print("Created icon.ico and icon.icns copies")
