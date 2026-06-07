#!/usr/bin/env node
/**
 * Deploy to Google Play Store via Fastlane.
 *
 * Usage:
 *   node scripts/deploy-playstore.js            # internal (default)
 *   node scripts/deploy-playstore.js beta        # open testing track
 *   node scripts/deploy-playstore.js release     # production (uploaded as draft)
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ANDROID_DIR = path.join(ROOT, 'android');

const mode = process.argv[2] || 'internal';
const VALID_MODES = ['internal', 'beta', 'release'];
if (!VALID_MODES.includes(mode)) {
  console.error(`Unknown mode: ${mode}. Use: ${VALID_MODES.join(' | ')}`);
  process.exit(1);
}

const logDir = `deploy-android-${mode}`;

// ── Pre-flight ───────────────────────────────────────────────────────────────

function ensurePnpmSymlink(pkgPath, displayName) {
  const WORKSPACE_ROOT = path.resolve(ROOT, '../..');
  const target = path.join(WORKSPACE_ROOT, 'node_modules/.pnpm/node_modules', pkgPath);
  const link = path.join(ROOT, 'node_modules', pkgPath);
  if (!fs.existsSync(link)) {
    fs.mkdirSync(path.dirname(link), { recursive: true });
    fs.symlinkSync(target, link);
    log('🔗', `Created ${displayName} symlink for Gradle`);
  }
}

// react-native-executorch v0.8.0 includes CxxModuleWrapper.h which was removed
// in React Native 0.84+. The header isn't actually used in the .cpp file.
function patchNativeModules() {
  const header = path.join(
    ROOT,
    'node_modules/react-native-executorch/android/src/main/cpp/ETInstallerModule.h'
  );
  if (!fs.existsSync(header)) return;
  const original = fs.readFileSync(header, 'utf8');
  const patched = original.replace('#include <react/jni/CxxModuleWrapper.h>\n', '');
  if (patched !== original) {
    fs.writeFileSync(header, patched);
    log('🔧', 'Patched react-native-executorch: removed stale CxxModuleWrapper.h include');
  }
}

function ensureGradleSymlinks() {
  const WORKSPACE_ROOT = path.resolve(ROOT, '../..');
  const storeScope = path.join(WORKSPACE_ROOT, 'node_modules/.pnpm/node_modules/@react-native');

  // Symlink every @react-native/* sub-package that exists in the pnpm dedup
  // store but is missing from apps/mobile/node_modules/@react-native/
  if (fs.existsSync(storeScope)) {
    for (const pkg of fs.readdirSync(storeScope)) {
      ensurePnpmSymlink(`@react-native/${pkg}`, `@react-native/${pkg}`);
    }
  }

  // Non-scoped packages also needed by Gradle / Hermes
  ensurePnpmSymlink('hermes-compiler', 'hermes-compiler');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

// ── Build log setup ─────────────────────────────────────────────────────────

function setupBuildLog() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('-');

  const dir = path.join(ROOT, 'build-logs', logDir, dateStr);
  fs.mkdirSync(dir, { recursive: true });

  return path.join(dir, `${logDir}-${timeStr}.log`);
}

// ── Log cleanup ─────────────────────────────────────────────────────────────

const MAX_LOGS = 10;

function pruneOldLogs() {
  const baseDir = path.join(ROOT, 'build-logs', logDir);
  if (!fs.existsSync(baseDir)) return;

  const allLogs = [];
  for (const entry of fs.readdirSync(baseDir)) {
    const dateDir = path.join(baseDir, entry);
    if (!fs.statSync(dateDir).isDirectory()) continue;
    for (const file of fs.readdirSync(dateDir)) {
      if (!file.endsWith('.log')) continue;
      const fullPath = path.join(dateDir, file);
      allLogs.push({ path: fullPath, dir: dateDir, mtime: fs.statSync(fullPath).mtimeMs });
    }
  }

  if (allLogs.length <= MAX_LOGS) return;

  allLogs.sort((a, b) => b.mtime - a.mtime);
  const toDelete = allLogs.slice(MAX_LOGS);
  let freed = 0;
  for (const entry of toDelete) {
    freed += fs.statSync(entry.path).size;
    fs.unlinkSync(entry.path);
  }

  for (const entry of fs.readdirSync(baseDir)) {
    const dateDir = path.join(baseDir, entry);
    if (fs.statSync(dateDir).isDirectory() && fs.readdirSync(dateDir).length === 0) {
      fs.rmdirSync(dateDir);
    }
  }

  const freedMB = (freed / 1024 / 1024).toFixed(1);
  log('🧹', `Pruned ${toDelete.length} old log${toDelete.length === 1 ? '' : 's'} (freed ${freedMB} MB)`);
}

// ── Main ────────────────────────────────────────────────────────────────────

const TRACK_LABELS = { internal: 'Internal Testing', beta: 'Open Testing', release: 'Production (draft)' };

async function main() {
  log('🚀', `Deploying Android app to ${TRACK_LABELS[mode]}...`);

  patchNativeModules();
  ensureGradleSymlinks();
  pruneOldLogs();

  const logPath = setupBuildLog();
  log('📄', `Log: ${logPath}`);

  const fastlaneCmd = [
    'eval "$(rbenv init -)"',
    `cd "${ANDROID_DIR}"`,
    `BUNDLE_GEMFILE="../Gemfile" bundle exec fastlane ${mode}`,
  ].join(' && ');

  const logStream = fs.createWriteStream(logPath);
  const exitCode = await new Promise((resolve) => {
    const child = spawn('bash', ['-lc', fastlaneCmd], {
      cwd: ROOT,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      logStream.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      logStream.write(data);
    });

    child.on('close', (code) => {
      logStream.end(() => resolve(code));
    });
  });

  if (exitCode === 0) {
    console.log('');
    log('✅', 'Deploy completed successfully!');
    log('📄', `Full log: ${logPath}`);
  } else {
    console.log('');
    log('❌', 'Deploy failed!');
    log('📄', `Full log: ${logPath}`);
    process.exit(1);
  }
}

main();
