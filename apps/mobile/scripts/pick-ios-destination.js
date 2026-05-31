#!/usr/bin/env node

const {execSync, spawn} = require('child_process');
const path = require('path');

const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const write = s => process.stdout.write(s);
const hideCursor = () => write('\x1b[?25l');
const showCursor = () => write('\x1b[?25h');
const moveTo = (row, col) => write(`\x1b[${row};${col}H`);
const clearScreen = () => write('\x1b[2J');

function getDestinations() {
  const raw = execSync('xcrun xctrace list devices 2>&1', {encoding: 'utf-8'});
  const lines = raw.split('\n');
  const items = [];
  const re = /^(.+?)\s+\(([^)]+)\)\s+\(([A-Fa-f0-9-]{24,36})\)$/;

  let section = null;
  for (const line of lines) {
    const t = line.trim();
    if (t === '== Devices ==') { section = 'device'; continue; }
    if (t === '== Simulators ==') { section = 'sim'; continue; }
    if (!section || !t) continue;

    const m = t.match(re);
    if (!m) continue;

    const [, name, ver, uuid] = m;

    if (section === 'device') {
      items.push({type: 'device', name: name.trim(), ver, id: uuid, label: `${name.trim()} (${ver})`});
    } else if (/iphone|ipad/i.test(name)) {
      const simName = name.trim().replace(/\s+Simulator$/i, '');
      items.push({type: 'sim', name: name.trim(), ver, id: simName, label: `${name.trim()} (${ver})`});
    }
  }
  return items;
}

function render(items, cursor) {
  clearScreen();
  moveTo(1, 1);

  write(`${c.bold}${c.cyan}  Pick an iOS destination${c.reset}  ${c.dim}↑↓/jk to move, Enter to select, q to quit${c.reset}\n`);
  write(`${c.dim}${'─'.repeat(60)}${c.reset}\n`);

  let lastType = null;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (item.type !== lastType) {
      if (lastType !== null) write('\n');
      const header = item.type === 'device' ? '  📱  Physical Devices' : '  💻  Simulators';
      write(`${c.bold}${c.dim}${header}${c.reset}\n`);
      lastType = item.type;
    }

    const isCurrent = i === cursor;
    const tag = item.type === 'device'
      ? `${c.yellow}device${c.reset}`
      : `${c.blue}sim${c.reset}`;

    if (isCurrent) {
      write(`  ${c.green}${c.bold}▸ ${item.label}${c.reset}  ${tag}\n`);
    } else {
      write(`  ${c.dim}  ${item.label}${c.reset}  ${tag}\n`);
    }
  }

  write(`\n${c.dim}${'─'.repeat(60)}${c.reset}\n`);
}

async function main() {
  const items = getDestinations();

  if (items.length === 0) {
    console.error('No iOS devices or simulators found.');
    process.exit(1);
  }

  let cursor = 0;

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf-8');
  hideCursor();

  render(items, cursor);

  const selected = await new Promise(resolve => {
    process.stdin.on('data', key => {
      if (key === '\x03' || key === 'q') {
        showCursor();
        clearScreen();
        moveTo(1, 1);
        write(`${c.yellow}Cancelled.${c.reset}\n`);
        process.exit(0);
      }

      if (key === '\x1b[A' || key === 'k') {
        cursor = cursor > 0 ? cursor - 1 : items.length - 1;
        render(items, cursor);
      }

      if (key === '\x1b[B' || key === 'j') {
        cursor = cursor < items.length - 1 ? cursor + 1 : 0;
        render(items, cursor);
      }

      if (key === '\r') {
        resolve(items[cursor]);
      }
    });
  });

  process.stdin.setRawMode(false);
  process.stdin.pause();
  showCursor();
  clearScreen();
  moveTo(1, 1);

  write(`${c.green}${c.bold}✅ ${selected.label}${c.reset}  `);
  if (selected.type === 'device') {
    write(`${c.yellow}(physical device)${c.reset}\n\n`);
  } else {
    write(`${c.blue}(simulator)${c.reset}\n\n`);
  }

  const cwd = path.join(__dirname, '..');

  if (selected.type === 'sim') {
    try {
      const bootState = execSync(
        `xcrun simctl list devices | grep "${selected.id}" | head -1`,
        {encoding: 'utf-8'},
      );
      if (!bootState.includes('Booted')) {
        write(`${c.blue}ℹ️  Booting simulator '${selected.id}'...${c.reset}\n`);
        try { execSync(`xcrun simctl boot "${selected.id}"`, {stdio: 'ignore'}); } catch {}
      }
    } catch {}

    const child = spawn(
      'pnpm', ['exec', 'rock', 'run:ios', '--device', selected.id],
      {stdio: 'inherit', cwd},
    );
    child.on('exit', code => process.exit(code || 0));
  } else {
    // Physical device — pass the UDID directly
    const child = spawn(
      'pnpm', ['exec', 'rock', 'run:ios', '--device', selected.id],
      {stdio: 'inherit', cwd},
    );
    child.on('exit', code => process.exit(code || 0));
  }
}

process.on('SIGINT', () => {
  showCursor();
  process.exit(0);
});

main().catch(err => {
  showCursor();
  console.error(err);
  process.exit(1);
});
