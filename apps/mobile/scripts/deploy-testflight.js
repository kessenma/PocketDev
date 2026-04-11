#!/usr/bin/env node
/**
 * Deploy to TestFlight via Fastlane rock_beta lane.
 *
 * Usage:
 *   node scripts/deploy-testflight.js          # beta (default)
 *   node scripts/deploy-testflight.js release   # release
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const IOS_DIR = path.join(ROOT, 'ios');

const mode = process.argv[2] || 'beta';
const lane = mode === 'release' ? 'rock_release' : 'rock_beta';
const logDir = mode === 'release' ? 'deploy-release' : 'deploy-beta';

// ── Helpers ──────────────────────────────────────────────────────────────────

function log(emoji, msg) {
  console.log(`${emoji} ${msg}`);
}

function run(cmd, opts = {}) {
  const result = spawnSync('bash', ['-lc', cmd], {
    stdio: opts.silent ? 'pipe' : 'inherit',
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...opts.env },
  });
  if (!opts.ignoreError && result.status !== 0) {
    throw new Error(`Command failed (exit ${result.status}): ${cmd}`);
  }
  return result;
}

// ── Pre-flight checks ───────────────────────────────────────────────────────

function ensureBuildDirs() {
  const dirs = [
    path.join(ROOT, 'build', 'generated', 'ios'),
    path.join(ROOT, 'build', 'generated', 'android'),
  ];
  for (const dir of dirs) {
    fs.mkdirSync(dir, { recursive: true });
  }
  for (const name of ['index.bundle', 'index.bundle.map']) {
    const f = path.join(ROOT, 'build', 'generated', 'ios', name);
    if (!fs.existsSync(f)) fs.writeFileSync(f, '');
  }
}

function sanitizeAppDelegate() {
  // Replace any hardcoded IP:8081 with localhost:8081 for release builds
  const file = path.join(IOS_DIR, 'Mobile', 'AppDelegate.swift');
  if (!fs.existsSync(file)) return;

  const content = fs.readFileSync(file, 'utf8');
  const updated = content.replace(
    /http:\/\/\d+\.\d+\.\d+\.\d+:8081/g,
    'http://localhost:8081'
  );
  if (updated !== content) {
    fs.writeFileSync(file, updated);
    log('🔧', 'Replaced hardcoded IP with localhost in AppDelegate.swift');
  }
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

  const logPath = path.join(dir, `${logDir}-${timeStr}.log`);
  return logPath;
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

async function main() {
  log('🚀', `Deploying iOS app to ${mode === 'release' ? 'App Store' : 'TestFlight'}...`);

  pruneOldLogs();
  ensureBuildDirs();
  sanitizeAppDelegate();

  const logPath = setupBuildLog();
  log('📄', `Log: ${path.relative(ROOT, logPath)}`);

  const fastlaneCmd = [
    'eval "$(rbenv init -)"',
    `cd "${IOS_DIR}"`,
    `BUNDLE_GEMFILE="$(pwd)/../Gemfile" bundle exec fastlane ${lane}`,
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
      logStream.end();
      resolve(code);
    });
  });

  if (exitCode === 0) {
    console.log('');
    log('✅', 'Deploy completed successfully!');
    log('📄', `Full log: ${path.relative(ROOT, logPath)}`);
  } else {
    console.log('');
    log('❌', 'Deploy failed!');
    log('📄', `Full log: ${path.relative(ROOT, logPath)}`);
    process.exit(1);
  }
}

main();
