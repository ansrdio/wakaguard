const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// WakaGuard SVG icon - Shield with W
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#3b82f6"/>
      <stop offset="100%" style="stop-color:#1e40af"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="100" fill="#1e293b"/>
  <path d="M256 60 L410 110 L410 240 C410 350 256 450 256 450 C256 450 102 350 102 240 L102 110 Z" fill="url(#shieldGrad)" stroke="#60a5fa" stroke-width="4"/>
  <text x="256" y="320" font-family="Arial, Helvetica, sans-serif" font-size="200" font-weight="bold" fill="white" text-anchor="middle">W</text>
  <path d="M340 170 L360 190 L400 140" stroke="#22c55e" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>`;

const sizes = [1024, 512, 192, 180, 152, 144, 128, 96, 72, 48];
const iconsDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  // Ensure directory exists
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svgContent);

  for (const size of sizes) {
    try {
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
      console.log(`Generated icon-${size}x${size}.png`);
    } catch (err) {
      console.error(`Error generating ${size}x${size}:`, err.message);
    }
  }

  console.log('\n✅ All PNG icons generated!');
}

generateIcons();
