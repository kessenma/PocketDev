import sharp from "sharp";
import pngToIco from "png-to-ico";
import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SOURCE = join(ROOT, "source", "icon-1024.png");
const OUT = join(ROOT, "generated");

// ---------------------------------------------------------------------------
// iOS
// ---------------------------------------------------------------------------

const IOS_ICONS = [
  { size: 20, scale: 2 },
  { size: 20, scale: 3 },
  { size: 29, scale: 2 },
  { size: 29, scale: 3 },
  { size: 40, scale: 2 },
  { size: 40, scale: 3 },
  { size: 60, scale: 2 },
  { size: 60, scale: 3 },
  { size: 1024, scale: 1 },
] as const;

function iosFilename(size: number, scale: number) {
  return `AppIcon-${size}@${scale}x.png`;
}

async function generateIos(source: sharp.Sharp) {
  const dir = join(OUT, "ios");
  await mkdir(dir, { recursive: true });

  const images: Array<{
    filename: string;
    idiom: string;
    scale: string;
    size: string;
  }> = [];

  await Promise.all(
    IOS_ICONS.map(async ({ size, scale }) => {
      const px = size * scale;
      const filename = iosFilename(size, scale);
      await source.clone().resize(px, px).png().toFile(join(dir, filename));
      images.push({
        filename,
        idiom: size === 1024 ? "ios-marketing" : "iphone",
        scale: `${scale}x`,
        size: `${size}x${size}`,
      });
    })
  );

  // Sort to match Xcode ordering (by size, then scale)
  images.sort((a, b) => {
    const sizeA = parseInt(a.size);
    const sizeB = parseInt(b.size);
    if (sizeA !== sizeB) return sizeA - sizeB;
    return a.scale.localeCompare(b.scale);
  });

  const contents = {
    images,
    info: { author: "xcode", version: 1 },
  };
  await writeFile(join(dir, "Contents.json"), JSON.stringify(contents, null, 2) + "\n");

  console.log(`  iOS: ${images.length} icons + Contents.json`);
}

// ---------------------------------------------------------------------------
// Android
// ---------------------------------------------------------------------------

const ANDROID_DENSITIES = [
  { dir: "mipmap-mdpi", size: 48 },
  { dir: "mipmap-hdpi", size: 72 },
  { dir: "mipmap-xhdpi", size: 96 },
  { dir: "mipmap-xxhdpi", size: 144 },
  { dir: "mipmap-xxxhdpi", size: 192 },
] as const;

async function makeRound(source: sharp.Sharp, size: number): Promise<Buffer> {
  const mask = Buffer.from(
    `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
  );
  return source
    .clone()
    .resize(size, size)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function generateAndroid(source: sharp.Sharp) {
  const dir = join(OUT, "android");
  let count = 0;

  await Promise.all(
    ANDROID_DENSITIES.map(async ({ dir: subdir, size }) => {
      const outDir = join(dir, subdir);
      await mkdir(outDir, { recursive: true });

      // Square launcher icon
      await source.clone().resize(size, size).png().toFile(join(outDir, "ic_launcher.png"));
      count++;

      // Round launcher icon
      const roundBuf = await makeRound(source, size);
      await writeFile(join(outDir, "ic_launcher_round.png"), roundBuf);
      count++;
    })
  );

  // Play Store icon (512x512)
  await source.clone().resize(512, 512).png().toFile(join(dir, "playstore-icon.png"));
  count++;

  console.log(`  Android: ${count} icons (${ANDROID_DENSITIES.length} densities + playstore)`);
}

// ---------------------------------------------------------------------------
// Web
// ---------------------------------------------------------------------------

const WEB_PNGS = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "apple-touch-icon.png", size: 180 },
  { name: "android-chrome-192x192.png", size: 192 },
  { name: "android-chrome-512x512.png", size: 512 },
] as const;

async function generateWeb(source: sharp.Sharp) {
  const dir = join(OUT, "web");
  await mkdir(dir, { recursive: true });

  // Generate PNGs
  await Promise.all(
    WEB_PNGS.map(async ({ name, size }) => {
      await source.clone().resize(size, size).png().toFile(join(dir, name));
    })
  );

  // Generate favicon.ico (multi-size: 16, 32, 48)
  const icoSizes = [16, 32, 48];
  const icoBuffers = await Promise.all(
    icoSizes.map((size) => source.clone().resize(size, size).png().toBuffer())
  );
  const ico = await pngToIco(icoBuffers);
  await writeFile(join(dir, "favicon.ico"), ico);

  // Generate site.webmanifest
  const manifest = {
    name: "PocketDev",
    short_name: "PocketDev",
    icons: [
      { src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    theme_color: "#ffffff",
    background_color: "#ffffff",
    display: "standalone",
  };
  await writeFile(join(dir, "site.webmanifest"), JSON.stringify(manifest, null, 2) + "\n");

  console.log(`  Web: ${WEB_PNGS.length} PNGs + favicon.ico + site.webmanifest`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`\nGenerating icons from ${SOURCE}\n`);

  const source = sharp(SOURCE);
  const meta = await source.metadata();

  if (!meta.width || !meta.height) {
    throw new Error("Could not read source image dimensions");
  }
  if (meta.width < 1024 || meta.height < 1024) {
    console.warn(`  ⚠ Source image is ${meta.width}x${meta.height} — recommended 1024x1024 minimum`);
  }

  await mkdir(OUT, { recursive: true });
  await Promise.all([generateIos(source), generateAndroid(source), generateWeb(source)]);

  console.log(`\nDone! Output in ${OUT}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
