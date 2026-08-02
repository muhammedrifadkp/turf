const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const standardSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="512" height="512" rx="112" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="#34d399" stroke-opacity="0.3" stroke-width="8" />

  <path d="M 256,90 L 370,140 C 370,270 320,360 256,410 C 192,360 142,270 142,140 Z" fill="url(#shieldGrad)" filter="url(#shadow)" />

  <path d="M 180,240 A 80,80 0 0,1 332,240" fill="none" stroke="#ecfdf5" stroke-opacity="0.4" stroke-width="6" stroke-dasharray="10 10" />
  <line x1="160" y1="260" x2="352" y2="260" stroke="#ffffff" stroke-opacity="0.6" stroke-width="6" />

  <g transform="translate(256, 230) scale(1.35)">
    <circle cx="0" cy="0" r="50" fill="#ffffff" filter="url(#shadow)"/>
    <polygon points="0,-22 21,-7 13,18 -13,18 -21,-7" fill="#0f172a" />
    <line x1="0" y1="-22" x2="0" y2="-48" stroke="#0f172a" stroke-width="4" />
    <line x1="21" y1="-7" x2="44" y2="-18" stroke="#0f172a" stroke-width="4" />
    <line x1="13" y1="18" x2="29" y2="38" stroke="#0f172a" stroke-width="4" />
    <line x1="-13" y1="18" x2="-29" y2="38" stroke="#0f172a" stroke-width="4" />
    <line x1="-21" y1="-7" x2="-44" y2="-18" stroke="#0f172a" stroke-width="4" />
    <circle cx="0" cy="0" r="49" fill="none" stroke="#0f172a" stroke-width="3" />
  </g>

  <text x="256" y="380" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" fill="#ffffff" text-anchor="middle" letter-spacing="3">TURF</text>
</svg>`;

const maskableSvg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#022c22" />
    </linearGradient>
    <linearGradient id="shieldGradMask" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <filter id="shadowMask" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#000000" flood-opacity="0.4"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bgGradMask)" />

  <g transform="translate(256, 245) scale(0.95)">
    <path d="M 0,-150 L 110,-100 C 110,30 60,110 0,160 C -60,110 -110,30 -110,-100 Z" fill="url(#shieldGradMask)" filter="url(#shadowMask)" />
    
    <g transform="translate(0, -10) scale(1.2)">
      <circle cx="0" cy="0" r="46" fill="#ffffff"/>
      <polygon points="0,-20 19,-6 12,16 -12,16 -19,-6" fill="#0f172a" />
      <line x1="0" y1="-20" x2="0" y2="-44" stroke="#0f172a" stroke-width="4" />
      <line x1="19" y1="-6" x2="40" y2="-16" stroke="#0f172a" stroke-width="4" />
      <line x1="12" y1="16" x2="26" y2="35" stroke="#0f172a" stroke-width="4" />
      <line x1="-12" y1="16" x2="-26" y2="35" stroke="#0f172a" stroke-width="4" />
      <line x1="-19" y1="-6" x2="-40" y2="-16" stroke="#0f172a" stroke-width="4" />
      <circle cx="0" cy="0" r="45" fill="none" stroke="#0f172a" stroke-width="3" />
    </g>

    <text x="0" y="125" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" fill="#ffffff" text-anchor="middle" letter-spacing="2">TURFARENA</text>
  </g>
</svg>`;

async function buildIcons() {
  const stdBuf = Buffer.from(standardSvg);
  const maskBuf = Buffer.from(maskableSvg);

  // Save SVG
  fs.writeFileSync(path.join(iconsDir, 'icon.svg'), standardSvg);

  // Generate PNGs
  await sharp(stdBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-512x512.png'));
  await sharp(stdBuf).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-192x192.png'));
  await sharp(stdBuf).resize(180, 180).png().toFile(path.join(iconsDir, 'apple-touch-icon.png'));
  await sharp(stdBuf).resize(180, 180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  
  await sharp(maskBuf).resize(512, 512).png().toFile(path.join(iconsDir, 'icon-maskable-512x512.png'));
  await sharp(maskBuf).resize(192, 192).png().toFile(path.join(iconsDir, 'icon-maskable-192x192.png'));

  await sharp(stdBuf).resize(32, 32).png().toFile(path.join(iconsDir, 'favicon-32x32.png'));
  await sharp(stdBuf).resize(16, 16).png().toFile(path.join(iconsDir, 'favicon-16x16.png'));

  console.log('Successfully generated all PWA icons!');
}

buildIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
