import sharp from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/icon.svg');
const svg = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  const outPath = resolve(__dirname, `../public/icon-${size}.png`);
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Generated ${outPath}`);
}

// Also generate apple-touch-icon (180x180)
const appleOut = resolve(__dirname, '../public/apple-touch-icon.png');
await sharp(svg).resize(180, 180).png().toFile(appleOut);
console.log(`Generated ${appleOut}`);
