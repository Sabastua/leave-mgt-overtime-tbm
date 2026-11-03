const fs = require('fs');
const path = require('path');

// Generate 32x32 ICO file with Safaricom Green (#008542) background and white "S" / Calendar motif
const WIDTH = 32;
const HEIGHT = 32;

// Create pixel buffer: 32x32 RGBA (stored as BGRA in BMP DIB)
const pixels = Buffer.alloc(WIDTH * HEIGHT * 4, 0);

// Helper to set pixel (x, y) with color [B, G, R, A]
// In BMP, rows are stored bottom-to-top (y = 0 is bottom row)
function setPixel(x, y, b, g, r, a = 255) {
  if (x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  const bmpY = (HEIGHT - 1) - y; // flip Y for BMP bottom-to-top
  const idx = (bmpY * WIDTH + x) * 4;
  pixels[idx + 0] = b;
  pixels[idx + 1] = g;
  pixels[idx + 2] = r;
  pixels[idx + 3] = a;
}

// Draw rounded rectangle background in Safaricom Green: R=0, G=133, B=66 (#008542)
const BG_B = 66, BG_G = 133, BG_R = 0;
const RADIUS = 6;

for (let y = 0; y < HEIGHT; y++) {
  for (let x = 0; x < WIDTH; x++) {
    // Check if inside rounded box (inset 1px)
    const minX = 1, maxX = 30;
    const minY = 1, maxY = 30;
    
    if (x < minX || x > maxX || y < minY || y > maxY) continue;
    
    // Check corners
    const inCornerTL = (x < minX + RADIUS && y < minY + RADIUS && Math.hypot(x - (minX + RADIUS), y - (minY + RADIUS)) > RADIUS);
    const inCornerTR = (x > maxX - RADIUS && y < minY + RADIUS && Math.hypot(x - (maxX - RADIUS), y - (minY + RADIUS)) > RADIUS);
    const inCornerBL = (x < minX + RADIUS && y > maxY - RADIUS && Math.hypot(x - (minX + RADIUS), y - (maxY - RADIUS)) > RADIUS);
    const inCornerBR = (x > maxX - RADIUS && y > maxY - RADIUS && Math.hypot(x - (maxX - RADIUS), y - (maxY - RADIUS)) > RADIUS);
    
    if (inCornerTL || inCornerTR || inCornerBL || inCornerBR) continue;

    // Inside badge
    setPixel(x, y, BG_B, BG_G, BG_R, 255);
  }
}

// Draw a crisp white bold "S" in the center (representing Safaricom)
// Coordinates for 32x32 grid:
// S shape from y=7 to y=24, x=10 to x=22
const S_COORDS = [
  // Top bar
  [12, 7], [13, 7], [14, 7], [15, 7], [16, 7], [17, 7], [18, 7], [19, 7],
  [11, 8], [12, 8], [13, 8], [14, 8], [15, 8], [16, 8], [17, 8], [18, 8], [19, 8], [20, 8],
  [10, 9], [11, 9], [12, 9], [19, 9], [20, 9], [21, 9],
  [10, 10], [11, 10], [20, 10], [21, 10],
  // Upper curve
  [10, 11], [11, 11], [12, 11],
  [10, 12], [11, 12], [12, 12], [13, 12],
  [10, 13], [11, 13], [12, 13], [13, 13], [14, 13],
  // Middle diagonal / waist
  [12, 14], [13, 14], [14, 14], [15, 14], [16, 14], [17, 14],
  [13, 15], [14, 15], [15, 15], [16, 15], [17, 15], [18, 15],
  [15, 16], [16, 16], [17, 16], [18, 16], [19, 16],
  [17, 17], [18, 17], [19, 17], [20, 17], [21, 17],
  // Lower curve
  [19, 18], [20, 18], [21, 18],
  [19, 19], [20, 19], [21, 19],
  [10, 20], [11, 20], [19, 20], [20, 20], [21, 20],
  [10, 21], [11, 21], [12, 21], [19, 21], [20, 21], [21, 21],
  [11, 22], [12, 22], [13, 22], [14, 22], [15, 22], [16, 22], [17, 22], [18, 22], [19, 22], [20, 22],
  [12, 23], [13, 23], [14, 23], [15, 23], [16, 23], [17, 23], [18, 23], [19, 23],
];

for (const [x, y] of S_COORDS) {
  setPixel(x, y, 255, 255, 255, 255);
}

// Build standard ICO file
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // Reserved
header.writeUInt16LE(1, 2); // Image type (1 = icon)
header.writeUInt16LE(1, 4); // Number of images

const dibHeaderSize = 40;
const pixelDataSize = WIDTH * HEIGHT * 4;
const maskSize = (WIDTH * HEIGHT) / 8; // 1-bit transparency mask (128 bytes)
const imageSize = dibHeaderSize + pixelDataSize + maskSize;

const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(WIDTH, 0);       // Width
dirEntry.writeUInt8(HEIGHT, 1);      // Height
dirEntry.writeUInt8(0, 2);           // Color count (0 for 32bpp)
dirEntry.writeUInt8(0, 3);           // Reserved
dirEntry.writeUInt16LE(1, 4);        // Color planes
dirEntry.writeUInt16LE(32, 6);       // Bits per pixel
dirEntry.writeUInt32LE(imageSize, 8); // Size of image data in bytes
dirEntry.writeUInt32LE(22, 12);      // Offset of image data from beginning of file

const dibHeader = Buffer.alloc(40);
dibHeader.writeUInt32LE(40, 0);         // Header size
dibHeader.writeInt32LE(WIDTH, 4);       // Width
dibHeader.writeInt32LE(HEIGHT * 2, 8);  // Height is doubled for ICO DIB
dibHeader.writeUInt16LE(1, 12);         // Planes
dibHeader.writeUInt16LE(32, 14);        // Bit count
dibHeader.writeUInt32LE(0, 16);         // Compression (0 = BI_RGB)
dibHeader.writeUInt32LE(pixelDataSize, 20); // Image size
dibHeader.writeInt32LE(0, 24);          // X pixels per meter
dibHeader.writeInt32LE(0, 28);          // Y pixels per meter
dibHeader.writeUInt32LE(0, 32);         // Colors used
dibHeader.writeUInt32LE(0, 36);         // Important colors

// 1-bit AND mask: 0 means opaque (pixels alpha takes care of transparency), all zeros
const andMask = Buffer.alloc(maskSize, 0);

const icoBuffer = Buffer.concat([header, dirEntry, dibHeader, pixels, andMask]);

// Write to src/app/favicon.ico and public/favicon.ico
const targetApp = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');
const targetPublic = path.join(__dirname, '..', 'public', 'favicon.ico');

fs.writeFileSync(targetApp, icoBuffer);
fs.writeFileSync(targetPublic, icoBuffer);

console.log('Successfully wrote', icoBuffer.length, 'bytes to favicon.ico');
