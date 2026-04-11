import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GENERATED = join(ROOT, "generated");
const MONOREPO = join(ROOT, "..", "..", "..");

// ---------------------------------------------------------------------------
// Copy helpers
// ---------------------------------------------------------------------------

/** Copy all files/dirs inside `from` into `to` (merging, not replacing the dir) */
async function copyDirContents(from: string, to: string) {
  await mkdir(to, { recursive: true });
  const entries = await readdir(from, { withFileTypes: true });
  for (const entry of entries) {
    const src = join(from, entry.name);
    const dest = join(to, entry.name);
    if (entry.isDirectory()) {
      await cp(src, dest, { recursive: true });
    } else {
      await cp(src, dest);
    }
  }
}

async function copyFile(from: string, to: string) {
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
}

// ---------------------------------------------------------------------------
// Distribution targets
// ---------------------------------------------------------------------------

interface CopySpec {
  label: string;
  from: string;
  to: string;
  mode: "dir-contents" | "file";
}

const copies: CopySpec[] = [
  {
    label: "iOS AppIcon.appiconset",
    from: join(GENERATED, "ios"),
    to: join(MONOREPO, "apps/mobile/ios/Mobile/Images.xcassets/AppIcon.appiconset"),
    mode: "dir-contents",
  },
  {
    label: "Android res/ (mipmap dirs)",
    from: join(GENERATED, "android"),
    to: join(MONOREPO, "apps/mobile/android/app/src/main/res"),
    mode: "dir-contents",
  },
  {
    label: "Android Play Store icon",
    from: join(GENERATED, "android", "playstore-icon.png"),
    to: join(MONOREPO, "apps/mobile/android/playstore-icon.png"),
    mode: "file",
  },
  {
    label: "Web app favicons",
    from: join(GENERATED, "web"),
    to: join(MONOREPO, "apps/web/public"),
    mode: "dir-contents",
  },
  {
    label: "Agent console favicons",
    from: join(GENERATED, "web"),
    to: join(MONOREPO, "apps/agent/console/public"),
    mode: "dir-contents",
  },
  {
    label: "Docs app favicons",
    from: join(GENERATED, "web"),
    to: join(MONOREPO, "apps/docs/public"),
    mode: "dir-contents",
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Verify generated/ exists
  try {
    await stat(GENERATED);
  } catch {
    console.error("No generated/ directory found. Run `pnpm generate` first.");
    process.exit(1);
  }

  console.log("\nDistributing icons to platform targets:\n");

  for (const spec of copies) {
    try {
      if (spec.mode === "dir-contents") {
        await copyDirContents(spec.from, spec.to);
      } else {
        await copyFile(spec.from, spec.to);
      }
      console.log(`  ✓ ${spec.label} → ${spec.to}`);
    } catch (err) {
      console.error(`  ✗ ${spec.label}: ${err}`);
    }
  }

  console.log("\nDone!\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
