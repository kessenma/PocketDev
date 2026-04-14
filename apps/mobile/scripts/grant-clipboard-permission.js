#!/usr/bin/env node
/**
 * Grants clipboard (pasteboard) permission to the PocketDev app in the booted iOS simulator.
 *
 * iOS 16+ requires explicit user approval when an app reads content copied from another app.
 * In development, this is annoying — this script pre-grants it by inserting directly into
 * the simulator's TCC.db (the same database that backs the permission dialog).
 *
 * Usage:  node scripts/grant-clipboard-permission.js
 *         pnpm grant-clipboard (via package.json script)
 */

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const BUNDLE_ID = 'run.pocketdev.mobile';
const TCC_SERVICE = 'kTCCServicePasteboard';

function run(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', ...opts }).trim();
}

// ── 1. Find the booted simulator ─────────────────────────────────────────────
let bootedUDID;
try {
  const json = run('xcrun simctl list devices booted --json');
  const { devices } = JSON.parse(json);
  const booted = Object.values(devices)
    .flat()
    .find((d) => d.state === 'Booted');

  if (!booted) {
    console.error('❌  No booted simulator found. Launch a simulator first.');
    process.exit(1);
  }

  bootedUDID = booted.udid;
  console.log(`📱  Booted simulator: ${booted.name} (${bootedUDID})`);
} catch (e) {
  console.error('❌  Failed to query simulators:', e.message);
  process.exit(1);
}

// ── 2. Locate TCC.db ─────────────────────────────────────────────────────────
const tccDb = path.join(
  process.env.HOME,
  'Library/Developer/CoreSimulator/Devices',
  bootedUDID,
  'data/Library/TCC/TCC.db',
);

if (!fs.existsSync(tccDb)) {
  console.error(`❌  TCC.db not found at:\n    ${tccDb}`);
  process.exit(1);
}

// ── 3. Insert / update the clipboard permission ───────────────────────────────
// auth_value=3 → Authorized (allowed without prompting)
// auth_reason=4 → Granted by user (we're spoofing it as such)
// auth_version=2 → current schema version
const sql = `
INSERT INTO access
  (service, client, client_type, auth_value, auth_reason, auth_version,
   csreq, policy_id, indirect_object_identifier_type, indirect_object_identifier,
   indirect_object_code_identity, flags, last_modified, pid, pid_version,
   boot_uuid, last_reminded)
VALUES
  ('${TCC_SERVICE}', '${BUNDLE_ID}', 0, 3, 4, 2,
   NULL, NULL, 0, 'UNUSED',
   NULL, 0, CAST(strftime('%s','now') AS INTEGER), NULL, NULL,
   'UNUSED', CAST(strftime('%s','now') AS INTEGER))
ON CONFLICT(service, client, client_type, indirect_object_identifier)
DO UPDATE SET
  auth_value = 3,
  auth_reason = 4,
  last_modified = CAST(strftime('%s','now') AS INTEGER);
`.trim();

const result = spawnSync('sqlite3', [tccDb, sql], { encoding: 'utf8' });

if (result.status !== 0) {
  console.error('❌  sqlite3 failed:', result.stderr);
  process.exit(1);
}

// ── 4. Verify ─────────────────────────────────────────────────────────────────
const check = run(
  `sqlite3 "${tccDb}" "SELECT client, auth_value FROM access WHERE service='${TCC_SERVICE}' AND client='${BUNDLE_ID}';"`,
);

if (check.includes(BUNDLE_ID)) {
  console.log(`✅  Clipboard permission granted for ${BUNDLE_ID}`);
  console.log(`    (auth_value=3 → Authorized)`);
} else {
  console.error('⚠️  Permission row not found after insert — check manually.');
}

// ── 5. Re-launch the app so it picks up the new permission ───────────────────
console.log('🔄  Relaunching app to apply permission...');
try {
  spawnSync('xcrun', ['simctl', 'terminate', bootedUDID, BUNDLE_ID]);
  spawnSync('xcrun', ['simctl', 'launch', bootedUDID, BUNDLE_ID]);
  console.log('✅  App relaunched.');
} catch {
  console.log('ℹ️  Could not relaunch app automatically — restart it manually.');
}
