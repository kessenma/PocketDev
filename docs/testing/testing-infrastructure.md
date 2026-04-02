# Phase: Testing Infrastructure

**Goal**: Fix two wire protocol bugs blocking mobile ↔ agent communication, add a dev-mode bypass for faster iteration, create four testing scripts, and document everything in `docs/testing/`.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md` and this phase doc. Read all files mentioned in each step before editing.

## Current Status

- Steps 1-3 are already implemented in the codebase.
- The pairing/auth protocol is now standardized on `deviceId`. Older `serverId` references in this doc were stale and have been corrected below.
- The original motivation for this phase still stands: run a local server on the dev machine and connect to it from the emulator to test the setup wizard and related mobile flows without deploying.
- The next logical implementation slice is `scripts/test-client.ts`, unless mobile Jest repair becomes more urgent.

---

## Prerequisites

- Phase 2 complete (agent server functional)
- Phase 3 complete (mobile app functional)
- `pnpm install` run at repo root
- Bun available locally (`bun --version`)

---

## Summary of All Deliverables

| Deliverable | Path | Type |
|---|---|---|
| Local emulator testing path | `docs/testing/testing-infrastructure.md` | Doc section |
| Bug fix: pairing field names | `apps/mobile/src/services/api.ts` | Edit |
| Bug fix: WebSocket auth | `apps/mobile/src/services/websocket.ts` | Edit |
| Dev mode bypass | `apps/agent/src/services/ws.ts`, `terminal-ws.ts`, `setup.ts`, `index.ts` | Edit |
| Test client script | `scripts/test-client.ts` | New file |
| Mock agent server | `scripts/mock-agent.ts` | New file |
| Integration test | `scripts/integration-test.ts` | New file |
| DB seed script | `scripts/seed-dev-db.ts` | New file |
| Docker compose update | `docker-compose.dev.yml` | Edit |
| Testing guide | `docs/testing/local-testing-guide.md` | New file |

---

## Step 0: Local Emulator Testing Path

### Purpose

This is the immediate developer workflow for building mobile features locally:

- run a PocketDev server on the local dev machine
- connect to it from the iOS simulator or Android emulator
- exercise the setup wizard, pairing, auth, and connected mobile UI without deploying

This step is intentionally higher priority than the broader testing infrastructure work below. The scripts and contract-style checks in later steps are still useful, but they support this workflow rather than replacing it.

### Recommended Modes

Use one of these modes depending on what you are testing:

1. Real local agent, full auth
   Best for validating the actual setup wizard and pairing flow end to end.

2. Real local agent, dev mode
   Best for rapid iteration on connected screens after pairing/auth are already understood.

3. Mock agent server
   Best for UI work when the real agent is unstable or incomplete.

### Track A: Real Local Agent for Setup Wizard Testing

Use the real agent when you need confidence that setup, pairing, and auth are working against the actual backend.

Run locally:

```bash
cd apps/agent
bun run dev
```

What this gives you:

- real setup code generation
- real `/setup/pair` behavior
- real device registration and auth flow
- the most useful path for validating the mobile setup wizard

How to connect from the emulator:

- iOS simulator: use `localhost:4387`
- Android emulator: use `10.0.2.2:4387`
- physical device on LAN: use your machine's LAN IP and ensure port `4387` is reachable

When this mode is the right choice:

- testing the first-run experience
- validating pairing bugs
- validating WebSocket auth issues
- reproducing production-like mobile-to-agent behavior locally

### Track B: Real Local Agent in Dev Mode

Use dev mode when you want a real local server but do not want pairing/auth friction on every restart.

Run locally:

```bash
cd apps/agent
POCKETDEV_DEV_MODE=1 bun run dev
```

What this gives you:

- auth bypass for the agent HTTP and WebSocket entry points
- automatic creation of `dev-device`
- generated credentials in `apps/agent/data/test-device.json`
- a faster loop for testing screens that assume an already-connected device

When this mode is the right choice:

- building post-setup mobile screens
- testing task/file/prerequisite flows locally
- iterating on agent-connected UI without re-pairing every time

### Track C: Dockerized Local Agent

Use Docker when you want the local server to run in a more isolated environment, but still keep the mobile app pointed at your own machine.

Current direction:

- `docker-compose.dev.yml` should be treated as the local-container path for the real agent
- the mobile app or emulator still connects to the host machine, not to a remote deployment
- if using Docker, make sure the agent port is published to the host so the simulator/emulator can reach it

Recommended hostnames:

- iOS simulator: `localhost`
- Android emulator: `10.0.2.2`

This path is useful, but it is not required to unblock local mobile testing. Running the agent directly on the host is the simplest starting point.

### Track D: Mock Agent for UI-Only Development

Use the mock server when the real agent is not needed and you only want predictable responses for mobile UI work.

This should remain a secondary path:

- good for canned setup/prerequisite/task/file responses
- useful when the real agent is still changing
- not sufficient for validating the real pairing/auth protocol

### Immediate Recommendation

For current development, the preferred order is:

1. Use the real local agent for setup wizard work.
2. Use `POCKETDEV_DEV_MODE=1` for rapid iteration once setup flow bugs are understood.
3. Add or use the mock server only when the real agent becomes a blocker for UI work.
4. Continue the deeper test-client, integration-test, and contract-test work after the local emulator workflow is solid.

### Quick Start In The Current Repo

Use this sequence to test locally right now:

1. Start the agent from `apps/agent/`.
   - Full pairing flow: `bun run dev`
   - Fast iteration mode: `POCKETDEV_DEV_MODE=1 bun run dev`
2. Start the mobile app from the repo root.
   - iOS: `pnpm ios`
   - Android: `pnpm android`
3. On the mobile connect screen, use:
   - iOS simulator: `localhost` and port `4387`
   - Android emulator: `10.0.2.2` and port `4387`
4. If running full pairing flow, enter the setup code exactly as printed by the agent, in `ABCD-1234` format.
5. If the agent says it is already paired and you need a fresh setup code, delete `apps/agent/data/` and restart it.

Current repo notes:

- The mobile connect screen now defaults to the local emulator host and port `4387`.
- The setup code input now matches the agent's actual format instead of the old 6-digit flow.

### Suggested Phase Ordering

Treat this local emulator workflow as a phase gate before the remaining test tooling:

1. Confirm the mobile app can connect to a local real agent from the emulator.
2. Confirm the setup wizard works against the local real agent.
3. Confirm dev mode supports faster local iteration.
4. Then continue with `scripts/test-client.ts`, mock-agent, integration checks, and later unit/contract tests.

---

## Step 1: Fix Bug — Pairing Request Field Name Mismatch

### Problem

The mobile app sends snake_case field names but the agent server expects camelCase. Pairing will fail with a validation error.

**Mobile sends** (file: `apps/mobile/src/services/api.ts`, lines 22-27):
```json
{
  "code": "...",
  "public_key": "hex...",
  "device_name": "ios device",
  "platform": "ios"
}
```

**Agent expects** (file: `apps/agent/src/routes/setup.ts`, lines 34-39):
```ts
body: t.Object({
  code: t.String(),
  publicKey: t.String(),
  deviceName: t.String(),
  platform: t.Optional(t.String()),
})
```

### Fix

Edit `apps/mobile/src/services/api.ts`. Change the `body: JSON.stringify({...})` block (around line 22-27) from:

```ts
body: JSON.stringify({
  code,
  public_key: publicKeyHex,
  device_name: `${Platform.OS} device`,
  platform: Platform.OS,
}),
```

To:

```ts
body: JSON.stringify({
  code,
  publicKey: publicKeyHex,
  deviceName: `${Platform.OS} device`,
  platform: Platform.OS,
}),
```

Also update the `PairResponse` interface (line 5-8) to match what the agent actually returns. Read `apps/agent/src/services/setup.ts` to see the `pairDevice` return value. The agent returns `{ deviceId, serverPublicKey }` (camelCase), so update:

```ts
interface PairResponse {
  deviceId: string
  serverPublicKey: string
}
```

And update the `saveServer` call (line 36) to use `data.deviceId`.

### Verify

After this fix, you should be able to:
1. Start the agent: `cd apps/agent && bun run dev`
2. Note the setup code printed to console
3. Use curl to test pairing:
```bash
curl -X POST http://localhost:4387/setup/pair \
  -H "Content-Type: application/json" \
  -d '{"code":"<SETUP_CODE>","publicKey":"aabbccdd","deviceName":"test","platform":"linux"}'
```
Should return `{ "deviceId": "...", "serverPublicKey": "..." }` instead of a validation error.

---

## Step 2: Fix Bug — WebSocket Auth Mechanism Mismatch

Status: completed in the current codebase.

### Problem

The mobile WebSocket client authenticates via URL query parameters, but the agent server expects an `Authorization` header with a base64-encoded JSON token.

**Mobile does** (file: `apps/mobile/src/services/websocket.ts`, line 34-38):
```ts
const pubKey = getPublicKeyHex()
const timestamp = Date.now().toString()
const signature = await signMessage(timestamp)
const wsUrl = `${this.url}?pubkey=${pubKey}&ts=${timestamp}&sig=${signature}`
this.ws = new WebSocket(wsUrl)
```

**Agent expects** (file: `apps/agent/src/services/ws.ts`, lines 21-47):
```ts
async function authenticate(authHeader: string | null): Promise<string | null> {
  const token = authHeader.replace(/^PocketDev\s+/i, '')
  const { deviceId, timestamp, signature } = JSON.parse(
    Buffer.from(token, 'base64').toString(),
  )
  // verifies signature of timestamp using device's stored public key looked up by deviceId
}
```

Key differences:
1. Agent reads `Authorization` header, not query params
2. Agent expects `deviceId` (the UUID assigned at pairing), not `pubkey` (the public key hex)
3. Agent expects a base64-encoded JSON object `{ deviceId, timestamp, signature }`
4. The signature is hex-encoded (see `fromHex()` in ws.ts line 12-17)

### Fix

The current codebase implements this through `apps/mobile/src/services/auth.ts` plus `apps/mobile/src/services/websocket.ts`. The WebSocket class builds an `Authorization` header via `buildPocketDevAuthorizationHeader()` instead of URL query params.

If re-applying the fix from scratch, edit `apps/mobile/src/services/websocket.ts`. The class needs access to `deviceId` and the device's private key to construct the auth header.

**Step 2a**: Update the constructor to accept a `deviceId` parameter. Change:

```ts
constructor(
  url: string,
  onStatusChange: (status: ConnectionStatus) => void,
  onMessage: MessageHandler,
) {
  this.url = url
  this.onStatusChange = onStatusChange
  this.onMessage = onMessage
}
```

To:

```ts
private deviceId: string

constructor(
  url: string,
  deviceId: string,
  onStatusChange: (status: ConnectionStatus) => void,
  onMessage: MessageHandler,
) {
  this.url = url
  this.deviceId = deviceId
  this.onStatusChange = onStatusChange
  this.onMessage = onMessage
}
```

**Step 2b**: Update the `connect()` method to build the auth header. Replace the query-param auth logic (lines 34-39) with:

```ts
async connect() {
  this.shouldReconnect = true
  this.onStatusChange('connecting')

  try {
    const timestamp = Date.now()
    const signature = await signMessage(String(timestamp))

    const token = btoa(JSON.stringify({
      deviceId: this.deviceId,
      timestamp,
      signature,
    }))

    // React Native WebSocket supports headers via 3rd argument
    this.ws = new WebSocket(this.url, undefined, {
      headers: {
        Authorization: `PocketDev ${token}`,
      },
    })

    // ... rest of onopen/onmessage/onclose/onerror handlers unchanged
```

> **Note for implementer**: React Native's WebSocket constructor accepts headers as the 3rd argument: `new WebSocket(url, protocols, { headers })`. This is NOT standard browser WebSocket — it's a React Native extension. Verify this works by checking `node_modules/react-native/Libraries/WebSocket/WebSocket.js`.

**Step 2c**: Update all call sites that create `PocketDevWebSocket` to pass `deviceId`. Search for `new PocketDevWebSocket` — it's likely in `apps/mobile/src/stores/connection.ts`. Read that file, find where the WebSocket is instantiated, and add the paired `deviceId` from the connection store's server state.

The connection store likely has `server: { ip, port, deviceId }` — pass `server.deviceId` as the `deviceId` parameter.

**Step 2d**: Ensure `signMessage` in `apps/mobile/src/services/crypto.ts` returns a **hex-encoded** string (not base64). Read the file to verify. The agent's `authenticate()` calls `fromHex(signature)`, so the signature must be hex. If `signMessage` returns a Uint8Array, convert it: `Buffer.from(sig).toString('hex')`.

### Verify

1. Start agent: `cd apps/agent && bun run dev`
2. Pair a device (use curl from Step 1 verify, or the test-client from Step 5)
3. Note the `deviceId` and use the test-client script (Step 5) to verify WebSocket auth works

---

## Step 3: Add `POCKETDEV_DEV_MODE` to Agent Server

Status: completed in the current codebase.

### Purpose

When `POCKETDEV_DEV_MODE=1` is set, the agent skips authentication and auto-pairs a test device on startup. This makes local development much faster.

### Step 3a: Auth bypass in WebSocket handlers

**File**: `apps/agent/src/services/ws.ts`

In the `authenticate()` function (line 21), add an early return at the top:

```ts
async function authenticate(authHeader: string | null): Promise<string | null> {
  if (process.env.POCKETDEV_DEV_MODE === '1') {
    return 'dev-device'
  }

  if (!authHeader) return null
  // ... rest unchanged
}
```

**File**: `apps/agent/src/services/terminal-ws.ts`

Read this file first. Find its `authenticate()` function (or equivalent auth check) and add the same early return:

```ts
if (process.env.POCKETDEV_DEV_MODE === '1') {
  return 'dev-device'
}
```

### Step 3b: Auto-pair on startup

**File**: `apps/agent/src/services/setup.ts`

Read this file fully first. Find the `initSetup()` function. The current implementation should:

```ts
if (DEV_MODE) {
  const devKeypair = generateKeypair()
  const publicKey = toHex(devKeypair.publicKey)
  const privateKey = toHex(devKeypair.privateKey)

  insertDevice(DEV_DEVICE_ID, publicKey, 'dev-device', 'dev')
  mkdirSync(DATA_DIR, { recursive: true })
  writeFileSync(
    DEV_CREDS_PATH,
    JSON.stringify({
      deviceId: DEV_DEVICE_ID,
      publicKey,
      privateKey,
      host: 'localhost',
      port: Number(process.env.POCKETDEV_PORT ?? 4387),
    }, null, 2),
    'utf-8',
  )

  return DEV_DEVICE_ID
}
```

This creates a real dev keypair on first boot with no devices, inserts `dev-device`, and writes matching credentials to `apps/agent/data/test-device.json`.

### Step 3c: Log dev mode on startup

**File**: `apps/agent/src/index.ts`

Near the top of the startup sequence (after imports, before server starts), add:

```ts
if (process.env.POCKETDEV_DEV_MODE === '1') {
  console.log('⚠️  DEV MODE ENABLED — authentication disabled, auto-pairing active')
}
```

### Step 3d: Update Docker Compose

**File**: `docker-compose.dev.yml`

In the `agent` service's `environment` section, add:

```yaml
- POCKETDEV_DEV_MODE=1
```

### Verify

```bash
cd apps/agent
POCKETDEV_DEV_MODE=1 bun run dev
```

Expected output should include:
- "DEV MODE ENABLED" warning
- `DEV MODE device ready: dev-device`
- No setup code prompt (already paired)

WebSocket connections should work without any auth header:
```bash
# This should connect and not be rejected (install websocat or use the test-client)
websocat ws://localhost:4387/ws
```

---

## Step 4: Create `scripts/` Directory and Package Config

Create the `scripts/` directory at the repo root. These scripts run with Bun and use the shared package.

**Create** `scripts/package.json`:
```json
{
  "name": "@pocketdev/scripts",
  "private": true,
  "type": "module"
}
```

The scripts import from `@pocketdev/shared` — they need access to the workspace. Since the root `pnpm-workspace.yaml` exists, the scripts can import shared code directly using relative imports or the workspace package name. Read `pnpm-workspace.yaml` to check if `scripts/` needs to be added to the workspace packages list. If it uses a glob like `packages/*` and `apps/*`, add `scripts` to the list.

---

## Step 5: Create `scripts/test-client.ts`

### Purpose

A Bun CLI script that acts as a headless mobile client. It can pair with the agent, open authenticated WebSocket connections, start tasks, and test file operations — all from the command line.

### Implementation

```ts
#!/usr/bin/env bun

/**
 * PocketDev Test Client
 *
 * Usage:
 *   bun run scripts/test-client.ts pair --code ABCD-1234 [--host localhost] [--port 4387]
 *   bun run scripts/test-client.ts ws [--host localhost] [--port 4387]
 *   bun run scripts/test-client.ts task "echo hello" [--agent shell] [--host localhost] [--port 4387]
 *   bun run scripts/test-client.ts files tree [--host localhost] [--port 4387]
 *   bun run scripts/test-client.ts files read <path> [--host localhost] [--port 4387]
 */

import { generateKeypair, sign } from '@pocketdev/shared/crypto'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// --- Config ---

const CREDS_FILE = resolve(import.meta.dir, '../apps/agent/data/test-device.json')
const DEFAULT_HOST = 'localhost'
const DEFAULT_PORT = 4387

interface Credentials {
  deviceId: string
  publicKey: string   // hex
  privateKey: string  // hex
  host: string
  port: number
}

// --- Helpers ---

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function loadCreds(): Credentials | null {
  if (!existsSync(CREDS_FILE)) return null
  return JSON.parse(readFileSync(CREDS_FILE, 'utf-8'))
}

function saveCreds(creds: Credentials) {
  writeFileSync(CREDS_FILE, JSON.stringify(creds, null, 2))
  console.log(`Credentials saved to ${CREDS_FILE}`)
}

function requireCreds(): Credentials {
  const creds = loadCreds()
  if (!creds) {
    console.error('No credentials found. Run "pair" command first.')
    process.exit(1)
  }
  return creds
}

async function buildAuthToken(creds: Credentials): Promise<string> {
  const timestamp = Date.now()
  const message = new TextEncoder().encode(String(timestamp))
  const sigBytes = await sign(message, fromHex(creds.privateKey))
  const token = Buffer.from(JSON.stringify({
    deviceId: creds.deviceId,
    timestamp,
    signature: toHex(sigBytes),
  })).toString('base64')
  return token
}

function baseUrl(creds: { host: string; port: number }): string {
  return `http://${creds.host}:${creds.port}`
}

// --- Commands ---

async function cmdPair(args: string[]) {
  let code = '', host = DEFAULT_HOST, port = DEFAULT_PORT

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--code' && args[i + 1]) code = args[++i]
    else if (args[i] === '--host' && args[i + 1]) host = args[++i]
    else if (args[i] === '--port' && args[i + 1]) port = parseInt(args[++i])
  }

  if (!code) {
    console.error('Usage: pair --code <SETUP_CODE>')
    process.exit(1)
  }

  // Generate keypair
  const keypair = await generateKeypair()
  const publicKeyHex = toHex(keypair.publicKey)
  const privateKeyHex = toHex(keypair.privateKey)

  console.log(`Pairing with ${host}:${port} using code ${code}...`)

  const resp = await fetch(`http://${host}:${port}/setup/pair`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      publicKey: publicKeyHex,
      deviceName: 'test-client',
      platform: 'script',
    }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    console.error(`Pairing failed (${resp.status}): ${text}`)
    process.exit(1)
  }

  const data = await resp.json() as { deviceId: string; serverPublicKey: string }
  console.log('Paired successfully!')
  console.log(`  Device ID: ${data.deviceId}`)
  console.log(`  Server Public Key: ${data.serverPublicKey}`)

  saveCreds({
    deviceId: data.deviceId,
    publicKey: publicKeyHex,
    privateKey: privateKeyHex,
    host,
    port,
  })
}

async function cmdWs(_args: string[]) {
  const creds = requireCreds()
  const token = await buildAuthToken(creds)
  const url = `ws://${creds.host}:${creds.port}/ws`

  console.log(`Connecting to ${url}...`)

  const ws = new WebSocket(url, {
    headers: { Authorization: `PocketDev ${token}` },
  } as any)

  ws.onopen = () => {
    console.log('Connected! Listening for messages (Ctrl+C to quit)...')
    // Send a ping
    ws.send(JSON.stringify({
      type: 'ping',
      id: crypto.randomUUID(),
      payload: {},
      timestamp: Date.now(),
    }))
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string)
    console.log(`[${msg.type}]`, JSON.stringify(msg.payload, null, 2))
  }

  ws.onclose = () => console.log('Disconnected')
  ws.onerror = (err) => console.error('WebSocket error:', err)
}

async function cmdTask(args: string[]) {
  const creds = requireCreds()
  let prompt = '', agentType = 'shell'

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--agent' && args[i + 1]) agentType = args[++i]
    else if (!args[i].startsWith('--')) prompt = args[i]
  }

  if (!prompt) {
    console.error('Usage: task "your prompt" [--agent shell|claude|codex]')
    process.exit(1)
  }

  const token = await buildAuthToken(creds)
  const url = `ws://${creds.host}:${creds.port}/ws`

  const ws = new WebSocket(url, {
    headers: { Authorization: `PocketDev ${token}` },
  } as any)

  ws.onopen = () => {
    console.log(`Starting task: "${prompt}" (agent: ${agentType})`)
    ws.send(JSON.stringify({
      type: 'task.start',
      id: crypto.randomUUID(),
      payload: { prompt, agentType },
      timestamp: Date.now(),
    }))
  }

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string)
    if (msg.type === 'task.output') {
      const line = msg.payload.line ?? msg.payload.data ?? JSON.stringify(msg.payload)
      process.stdout.write(line + '\n')
    } else if (msg.type === 'task.status_changed' || msg.type === 'task.completed') {
      console.log(`\n[${msg.type}]`, JSON.stringify(msg.payload))
      if (msg.type === 'task.completed') {
        ws.close()
        process.exit(0)
      }
    } else if (msg.type !== 'pong') {
      console.log(`[${msg.type}]`, JSON.stringify(msg.payload))
    }
  }
}

async function cmdFiles(args: string[]) {
  const creds = requireCreds()
  const sub = args[0]
  const url = baseUrl(creds)

  if (sub === 'tree') {
    const resp = await fetch(`${url}/files/tree?path=.&depth=2`)
    console.log(await resp.json())
  } else if (sub === 'read' && args[1]) {
    const resp = await fetch(`${url}/files/read?path=${encodeURIComponent(args[1])}`)
    console.log(await resp.text())
  } else if (sub === 'write' && args[1] && args[2]) {
    const resp = await fetch(`${url}/files/write`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: args[1], content: args[2] }),
    })
    console.log(resp.status, await resp.text())
  } else {
    console.error('Usage: files tree | files read <path> | files write <path> <content>')
  }
}

// --- CLI Router ---

const [command, ...args] = process.argv.slice(2)

switch (command) {
  case 'pair': await cmdPair(args); break
  case 'ws': await cmdWs(args); break
  case 'task': await cmdTask(args); break
  case 'files': await cmdFiles(args); break
  default:
    console.log(`PocketDev Test Client

Commands:
  pair --code <CODE>           Pair with agent server
  ws                           Open authenticated WebSocket (listen mode)
  task "prompt" [--agent type] Run a task and stream output
  files tree                   List files
  files read <path>            Read a file
  files write <path> <content> Write a file

Options:
  --host <host>  Agent host (default: localhost)
  --port <port>  Agent port (default: 4387)`)
}
```

> **Important for implementer**: The `generateKeypair` and `sign` functions are imported from `@pocketdev/shared/crypto`. Read `packages/shared/src/crypto/ed25519.ts` to verify the exact function signatures and return types. The `sign` function may expect `(message: Uint8Array, privateKey: Uint8Array)` or `(message: string, privateKey: Uint8Array)` — adapt accordingly. The key format (Uint8Array vs hex string) may also need conversion.

---

## Step 6: Create `scripts/mock-agent.ts`

### Purpose

A lightweight Elysia server that mimics the real agent API. Mobile developers can point their app at this instead of running the full agent. It accepts any auth, returns canned data, and simulates task output.

### Implementation

```ts
#!/usr/bin/env bun

/**
 * PocketDev Mock Agent Server
 *
 * Mimics the real agent API with canned responses.
 * Accepts any authentication. Simulates task output.
 *
 * Usage: bun run scripts/mock-agent.ts [--port 4387]
 */

import { Elysia, t } from 'elysia'

const port = parseInt(process.argv.find((_, i, a) => a[i - 1] === '--port') ?? '4387')

const app = new Elysia()

  // Health
  .get('/health', () => ({
    status: 'ok',
    paired: true,
    uptime: Math.floor(process.uptime()),
    version: '0.0.0-mock',
  }))

  // Setup (always report as already paired)
  .get('/setup', ({ set }) => {
    set.status = 404
    return { error: 'Setup already completed' }
  })

  // Pairing (always succeed)
  .post('/setup/pair', ({ body }) => ({
    deviceId: 'mock-device-' + crypto.randomUUID().slice(0, 8),
    serverPublicKey: '0'.repeat(64),
  }), {
    body: t.Object({
      code: t.String(),
      publicKey: t.String(),
      deviceName: t.String(),
      platform: t.Optional(t.String()),
    }),
  })

  // Prerequisites
  .get('/setup/prerequisites', () => ({
    os: 'linux',
    arch: 'x64',
    ready: true,
    tools: [
      { id: 'git', name: 'Git', status: 'installed', version: '2.43.0', required: true, auth_status: 'not_applicable', path: '/usr/bin/git', install_command: null, auth_command: null },
      { id: 'node', name: 'Node.js', status: 'installed', version: '22.0.0', required: true, auth_status: 'not_applicable', path: '/usr/bin/node', install_command: null, auth_command: null },
      { id: 'bun', name: 'Bun', status: 'installed', version: '1.1.0', required: false, auth_status: 'not_applicable', path: '/usr/bin/bun', install_command: null, auth_command: null },
      { id: 'claude', name: 'Claude CLI', status: 'installed', version: '1.0.0', required: true, auth_status: 'authenticated', path: '/usr/bin/claude', install_command: null, auth_command: null },
    ],
  }))

  // File tree
  .get('/files/tree', () => ({
    name: '.',
    type: 'directory',
    children: [
      { name: 'package.json', type: 'file', size: 234 },
      { name: 'src', type: 'directory', children: [
        { name: 'index.ts', type: 'file', size: 1024 },
        { name: 'app.tsx', type: 'file', size: 2048 },
      ]},
      { name: 'README.md', type: 'file', size: 512 },
    ],
  }))

  // File read
  .get('/files/read', ({ query }) => ({
    path: query.path,
    content: `// Mock content of ${query.path}\nconsole.log("Hello from mock agent!");\n`,
  }))

  // File write
  .put('/files/write', ({ body }) => ({
    success: true,
    path: (body as any).path,
  }))

  // File search
  .get('/files/search', ({ query }) => ({
    query: query.q,
    results: [
      { path: 'src/index.ts', line: 3, content: `  // matches "${query.q}"` },
    ],
  }))

  // Task WebSocket
  .ws('/ws', {
    open(ws) {
      console.log('Client connected to /ws (mock, no auth required)')
    },
    message(ws, raw) {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as any

      switch (msg.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            id: crypto.randomUUID(),
            payload: {},
            timestamp: Date.now(),
          }))
          break

        case 'task.start': {
          const taskId = crypto.randomUUID()
          const prompt = msg.payload?.prompt ?? 'unknown'

          // Send status change
          ws.send(JSON.stringify({
            type: 'task.status_changed',
            id: crypto.randomUUID(),
            payload: { taskId, status: 'running', prompt },
            timestamp: Date.now(),
          }))

          // Simulate output lines
          const lines = [
            `$ Running task: ${prompt}`,
            'Analyzing project structure...',
            'Reading package.json...',
            'Found 3 source files.',
            'Applying changes...',
            'Writing src/index.ts...',
            'Done! All changes applied successfully.',
          ]

          lines.forEach((line, i) => {
            setTimeout(() => {
              ws.send(JSON.stringify({
                type: 'task.output',
                id: crypto.randomUUID(),
                payload: { taskId, stream: 'stdout', line },
                timestamp: Date.now(),
              }))

              // Send completion after last line
              if (i === lines.length - 1) {
                setTimeout(() => {
                  ws.send(JSON.stringify({
                    type: 'task.completed',
                    id: crypto.randomUUID(),
                    payload: { taskId, status: 'completed', exitCode: 0 },
                    timestamp: Date.now(),
                  }))
                }, 200)
              }
            }, (i + 1) * 300) // 300ms between lines
          })
          break
        }

        case 'task.kill':
          ws.send(JSON.stringify({
            type: 'task.status_changed',
            id: crypto.randomUUID(),
            payload: { taskId: msg.payload?.taskId, status: 'killed' },
            timestamp: Date.now(),
          }))
          break

        case 'task.list':
          ws.send(JSON.stringify({
            type: 'task.list',
            id: crypto.randomUUID(),
            payload: { tasks: [] },
            timestamp: Date.now(),
          }))
          break

        case 'setup.check_prerequisites':
          ws.send(JSON.stringify({
            type: 'setup.prerequisites_result',
            id: crypto.randomUUID(),
            payload: {
              os: 'linux', arch: 'x64', ready: true,
              tools: [
                { id: 'git', name: 'Git', status: 'installed', version: '2.43.0', required: true },
              ],
            },
            timestamp: Date.now(),
          }))
          break
      }
    },
    close() {
      console.log('Client disconnected from /ws')
    },
  })

  // Terminal WebSocket (echo mode)
  .ws('/ws/terminal', {
    open(ws) {
      console.log('Client connected to /ws/terminal (mock)')
      ws.send(JSON.stringify({
        type: 'terminal.output',
        id: crypto.randomUUID(),
        payload: { data: 'mock-server:~$ ' },
        timestamp: Date.now(),
      }))
    },
    message(ws, raw) {
      const msg = typeof raw === 'string' ? JSON.parse(raw) : raw as any
      if (msg.type === 'terminal.input') {
        // Echo input back with a fake response
        const input = msg.payload?.data ?? ''
        ws.send(JSON.stringify({
          type: 'terminal.output',
          id: crypto.randomUUID(),
          payload: { data: `${input}\nmock output for: ${input.trim()}\nmock-server:~$ ` },
          timestamp: Date.now(),
        }))
      }
    },
    close() {
      console.log('Client disconnected from /ws/terminal')
    },
  })

  .listen(port)

console.log(`🎭 Mock PocketDev Agent running on http://localhost:${port}`)
console.log('   All auth is bypassed. Task output is simulated.')
console.log('   Use Ctrl+C to stop.')
```

> **Note for implementer**: Elysia must be available. Either install it in the scripts directory (`cd scripts && bun add elysia`) or ensure it resolves from the workspace (check if `apps/agent/node_modules/elysia` is hoisted). If not, add `elysia` as a dependency in `scripts/package.json`.

---

## Step 7: Create `scripts/seed-dev-db.ts`

### Purpose

Pre-seeds the agent's SQLite database with a known test device, so you can skip the pairing flow entirely during development.

### Implementation

Read `apps/agent/src/db/index.ts` and `apps/agent/src/db/schema.sql` first to understand the exact table structure and DB initialization.

The script should:

1. Create the SQLite database at `apps/agent/data/pocketdev.db`
2. Run the schema SQL to create tables
3. Generate a deterministic Ed25519 keypair for the server (or use a fixed one)
4. Insert a test device into the `devices` table with a known keypair
5. Insert the server keypair into `server_config`
6. Write the matching client credentials to `apps/agent/data/test-device.json`

```ts
#!/usr/bin/env bun

/**
 * Seed the agent's SQLite DB with a test device.
 * After running this, the agent starts in "already paired" mode.
 *
 * Usage: bun run scripts/seed-dev-db.ts
 */

import { Database } from 'bun:sqlite'
import { generateKeypair } from '@pocketdev/shared/crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const DATA_DIR = resolve(import.meta.dir, '../apps/agent/data')
const DB_PATH = resolve(DATA_DIR, 'pocketdev.db')
const CREDS_PATH = resolve(DATA_DIR, 'test-device.json')
const SCHEMA_PATH = resolve(import.meta.dir, '../apps/agent/src/db/schema.sql')

// Helper
function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

// Create data dir
mkdirSync(DATA_DIR, { recursive: true })

// Open/create DB
const db = new Database(DB_PATH)
db.exec('PRAGMA journal_mode=WAL')
db.exec('PRAGMA foreign_keys=ON')

// Run schema
const schema = readFileSync(SCHEMA_PATH, 'utf-8')
db.exec(schema)

// Generate server keypair
const serverKeypair = await generateKeypair()
const serverPubHex = toHex(serverKeypair.publicKey)
const serverPrivHex = toHex(serverKeypair.privateKey)

// Store server config
db.run(`INSERT OR REPLACE INTO server_config (key, value) VALUES ('public_key', ?)`, [serverPubHex])
db.run(`INSERT OR REPLACE INTO server_config (key, value) VALUES ('private_key', ?)`, [serverPrivHex])

// Generate device keypair
const deviceKeypair = await generateKeypair()
const devicePubHex = toHex(deviceKeypair.publicKey)
const devicePrivHex = toHex(deviceKeypair.privateKey)
const deviceId = crypto.randomUUID().replace(/-/g, '').slice(0, 32)

// Insert test device
db.run(
  `INSERT OR REPLACE INTO devices (id, public_key, name, platform, created_at, last_seen_at)
   VALUES (?, ?, 'test-client', 'script', datetime('now'), datetime('now'))`,
  [deviceId, devicePubHex]
)

// Write client credentials
writeFileSync(CREDS_PATH, JSON.stringify({
  deviceId,
  publicKey: devicePubHex,
  privateKey: devicePrivHex,
  host: 'localhost',
  port: 4387,
}, null, 2))

console.log('✅ Database seeded successfully!')
console.log(`   DB: ${DB_PATH}`)
console.log(`   Device ID: ${deviceId}`)
console.log(`   Credentials: ${CREDS_PATH}`)
console.log('')
console.log('Start the agent normally (no setup code needed):')
console.log('   cd apps/agent && bun run dev')

db.close()
```

> **Important for implementer**: The schema SQL file path and table column names must match what's actually in the codebase. Read `apps/agent/src/db/schema.sql` and `apps/agent/src/db/index.ts` to verify. The column names might be `last_seen` vs `last_seen_at`, etc.

---

## Step 8: Create `scripts/integration-test.ts`

### Purpose

Runs the full lifecycle test: start agent → pair → WebSocket → task → file ops → cleanup. Exit code 0 on success, 1 on failure.

### Implementation

```ts
#!/usr/bin/env bun

/**
 * PocketDev Integration Test
 *
 * Tests the full lifecycle: agent boot → pair → WebSocket → task → files → cleanup
 *
 * Usage: bun run scripts/integration-test.ts
 *
 * The script starts its own agent process — don't run one separately.
 */

import { generateKeypair, sign } from '@pocketdev/shared/crypto'
import { spawn, type Subprocess } from 'bun'
import { rmSync, mkdirSync } from 'fs'
import { resolve } from 'path'

const PORT = 14387 // Use a non-default port to avoid conflicts
const DATA_DIR = resolve(import.meta.dir, '../.test-data')
const PROJECT_DIR = resolve(import.meta.dir, '../.test-project')
const AGENT_DIR = resolve(import.meta.dir, '../apps/agent')

let agent: Subprocess | null = null
let passed = 0
let failed = 0

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

function fromHex(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
  }
  return bytes
}

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.error(`  ❌ ${message}`)
    failed++
  }
}

async function waitForServer(maxWait = 10000): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    try {
      const resp = await fetch(`http://localhost:${PORT}/health`)
      if (resp.ok) return true
    } catch {}
    await Bun.sleep(200)
  }
  return false
}

async function buildAuthToken(deviceId: string, privateKey: Uint8Array): Promise<string> {
  const timestamp = Date.now()
  const message = new TextEncoder().encode(String(timestamp))
  const sigBytes = await sign(message, privateKey)
  return Buffer.from(JSON.stringify({
    deviceId,
    timestamp,
    signature: toHex(sigBytes),
  })).toString('base64')
}

// --- Setup ---

console.log('\n🧪 PocketDev Integration Test\n')

// Clean up previous test data
rmSync(DATA_DIR, { recursive: true, force: true })
rmSync(PROJECT_DIR, { recursive: true, force: true })
mkdirSync(DATA_DIR, { recursive: true })
mkdirSync(PROJECT_DIR, { recursive: true })

// Start agent
console.log('Phase 1: Starting agent...')
agent = spawn({
  cmd: ['bun', 'run', 'src/index.ts'],
  cwd: AGENT_DIR,
  env: {
    ...process.env,
    POCKETDEV_PORT: String(PORT),
    POCKETDEV_DATA_DIR: DATA_DIR,
    POCKETDEV_PROJECT_DIR: PROJECT_DIR,
  },
  stdout: 'pipe',
  stderr: 'pipe',
})

// Wait for agent to be ready
const serverUp = await waitForServer()
assert(serverUp, 'Agent started and responding on /health')
if (!serverUp) {
  console.error('Agent failed to start. Aborting.')
  agent?.kill()
  process.exit(1)
}

// --- Phase 2: Health check ---
console.log('\nPhase 2: Health check...')
const healthResp = await fetch(`http://localhost:${PORT}/health`)
const health = await healthResp.json() as any
assert(health.status === 'ok', 'Health status is ok')
assert(health.paired === false, 'Not yet paired')

// --- Phase 3: Setup status ---
console.log('\nPhase 3: Setup status...')
const setupResp = await fetch(`http://localhost:${PORT}/setup`)
assert(setupResp.ok, 'Setup endpoint returns 200')

// --- Phase 4: Pairing ---
console.log('\nPhase 4: Pairing...')

// Read setup code from agent stdout
// The agent prints the setup code to stdout. We need to capture it.
// Read from the agent's stdout pipe to find the setup code.
// The format is typically "Setup code: XXXX-YYYY" — read setup.ts to verify exact format.
// Alternative: since we're testing, we can read the DB directly after agent creates it.
// For robustness, let's read from stdout.

let setupCode = ''
const reader = agent.stdout.getReader()
const decoder = new TextDecoder()
let buffer = ''
const codeTimeout = setTimeout(() => {
  console.error('Timed out waiting for setup code')
  agent?.kill()
  process.exit(1)
}, 5000)

while (!setupCode) {
  const { value, done } = await reader.read()
  if (done) break
  buffer += decoder.decode(value, { stream: true })
  // Look for the setup code pattern — adjust regex based on actual agent output format
  // Read apps/agent/src/services/setup.ts to see how the code is printed
  const match = buffer.match(/Setup code:\s*([A-Z0-9-]+)/i)
    ?? buffer.match(/([A-Z]{4}-\d{4})/i)
    ?? buffer.match(/code[:\s]+(\S{6,})/i)
  if (match) {
    setupCode = match[1]
  }
}
clearTimeout(codeTimeout)
reader.releaseLock()

assert(!!setupCode, `Got setup code: ${setupCode}`)

const keypair = await generateKeypair()
const pubHex = toHex(keypair.publicKey)
const privKey = keypair.privateKey

const pairResp = await fetch(`http://localhost:${PORT}/setup/pair`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    code: setupCode,
    publicKey: pubHex,
    deviceName: 'integration-test',
    platform: 'script',
  }),
})

assert(pairResp.ok, 'Pairing request succeeded')
const pairData = await pairResp.json() as any
const deviceId = pairData.deviceId
assert(!!deviceId, `Got device ID: ${deviceId}`)

// Verify setup is now disabled
const setupResp2 = await fetch(`http://localhost:${PORT}/setup`)
assert(setupResp2.status === 404, 'Setup endpoint returns 404 after pairing')

// --- Phase 5: WebSocket ---
console.log('\nPhase 5: WebSocket auth + ping...')

const token = await buildAuthToken(deviceId, privKey)
const ws = new WebSocket(`ws://localhost:${PORT}/ws`, {
  headers: { Authorization: `PocketDev ${token}` },
} as any)

const wsConnected = await new Promise<boolean>((resolve) => {
  const timeout = setTimeout(() => resolve(false), 3000)
  ws.onopen = () => { clearTimeout(timeout); resolve(true) }
  ws.onerror = () => { clearTimeout(timeout); resolve(false) }
})
assert(wsConnected, 'WebSocket connected with auth')

// Ping/pong
const pongReceived = await new Promise<boolean>((resolve) => {
  const timeout = setTimeout(() => resolve(false), 3000)
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string)
    if (msg.type === 'pong') { clearTimeout(timeout); resolve(true) }
  }
  ws.send(JSON.stringify({
    type: 'ping', id: crypto.randomUUID(), payload: {}, timestamp: Date.now(),
  }))
})
assert(pongReceived, 'Received pong response')

// --- Phase 6: Task execution ---
console.log('\nPhase 6: Task execution...')

const taskOutput: string[] = []
let taskCompleted = false

const taskDone = new Promise<boolean>((resolve) => {
  const timeout = setTimeout(() => resolve(false), 15000)
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data as string)
    if (msg.type === 'task.output') {
      taskOutput.push(msg.payload.line)
    } else if (msg.type === 'task.completed' || msg.type === 'task.status_changed') {
      if (msg.payload.status === 'completed') {
        taskCompleted = true
        clearTimeout(timeout)
        resolve(true)
      }
    }
  }
})

ws.send(JSON.stringify({
  type: 'task.start',
  id: crypto.randomUUID(),
  payload: { prompt: 'echo integration-test-ok', agentType: 'shell' },
  timestamp: Date.now(),
}))

const taskFinished = await taskDone
assert(taskFinished, 'Task completed')
assert(taskOutput.some(l => l.includes('integration-test-ok')), 'Task output contains expected string')

ws.close()

// --- Phase 7: File operations ---
console.log('\nPhase 7: File operations...')

// Write
const writeResp = await fetch(`http://localhost:${PORT}/files/write`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ path: '_test_file.txt', content: 'integration test content' }),
})
assert(writeResp.ok, 'File write succeeded')

// Read
const readResp = await fetch(`http://localhost:${PORT}/files/read?path=_test_file.txt`)
const readData = await readResp.json() as any
assert(readData.content?.includes('integration test content'), 'File read returns correct content')

// Tree
const treeResp = await fetch(`http://localhost:${PORT}/files/tree?path=.&depth=1`)
const treeData = await treeResp.json() as any
assert(treeResp.ok, 'File tree request succeeded')

// Delete
const delResp = await fetch(`http://localhost:${PORT}/files/delete?path=_test_file.txt`, {
  method: 'DELETE',
})
assert(delResp.ok, 'File delete succeeded')

// --- Cleanup ---
console.log('\nPhase 8: Cleanup...')
agent?.kill()
rmSync(DATA_DIR, { recursive: true, force: true })
rmSync(PROJECT_DIR, { recursive: true, force: true })

// --- Results ---
console.log(`\n${'='.repeat(40)}`)
console.log(`Results: ${passed} passed, ${failed} failed`)
console.log(`${'='.repeat(40)}\n`)

process.exit(failed > 0 ? 1 : 0)
```

> **Important for implementer**: The setup code extraction from stdout is fragile. Read `apps/agent/src/services/setup.ts` and `apps/agent/src/index.ts` to find the exact `console.log` format for the setup code, and adjust the regex accordingly. Also verify the `sign()` function signature from `@pocketdev/shared/crypto`.

---

## Step 9: Create `docs/testing/local-testing-guide.md`

### Purpose

The user-facing documentation that ties everything together. Write this AFTER all scripts and changes are implemented, so you can verify the exact commands work.

### Structure

```markdown
# PocketDev Local Testing Guide

## Quick Start

### Option 1: Dev Mode (fastest — no auth, auto-paired)

  POCKETDEV_DEV_MODE=1 bun run dev  (in apps/agent/)

  - Auth is disabled, any WebSocket client can connect
  - A test device is auto-paired on startup
  - Use with: test-client, curl, mobile simulator, websocat

### Option 2: Full Auth (realistic — tests real pairing flow)

  cd apps/agent && bun run dev
  # Note the setup code, then:
  bun run scripts/test-client.ts pair --code <CODE>
  bun run scripts/test-client.ts ws

### Option 3: Mock Server (for mobile UI development)

  bun run scripts/mock-agent.ts
  # Point mobile app at localhost:4387
  # All endpoints return canned data, tasks simulate output

### Option 4: Docker (full environment)

  docker compose -f docker-compose.dev.yml up

## Testing Scripts

### test-client.ts — Headless Mobile Client
[Document all commands with examples]

### mock-agent.ts — Fake Agent for Mobile Dev
[Document usage and what it simulates]

### integration-test.ts — Full Lifecycle Test
[Document what it tests and expected output]

### seed-dev-db.ts — Pre-seed Database
[Document when to use and what it creates]

## Testing Specific Features

### Pairing Flow
[curl commands + test-client commands]

### WebSocket Tasks
[test-client task command examples]

### Terminal Sessions
[How to test with test-client or websocat]

### File Operations
[curl examples for all /files/* endpoints]

### Dev Preview Proxy
[How to test with sample-app in Docker]

## Database Inspection

  sqlite3 apps/agent/data/pocketdev.db
  .tables
  SELECT * FROM devices;
  SELECT * FROM tasks ORDER BY created_at DESC LIMIT 5;
  SELECT * FROM task_logs WHERE task_id = '...';

## Resetting State

  rm -rf apps/agent/data/   # Wipe DB, fresh setup mode on next start

## Mobile Simulator Testing

### iOS Simulator
- Agent on localhost:4387 — simulator can reach localhost directly
- Enter "localhost" and "4387" in ConnectScreen

### Android Emulator
- Agent on localhost:4387 — use 10.0.2.2:4387 from emulator (Android's localhost alias)

### Physical Device
- Agent on your machine — use your LAN IP (e.g., 192.168.1.x:4387)
- Ensure both device and machine are on the same WiFi network

## Troubleshooting

### "Setup expired" when trying to pair
- The setup code expires after 15 minutes
- Delete `apps/agent/data/` and restart the agent for a fresh code
- Or use `POCKETDEV_DEV_MODE=1` to skip pairing entirely

### WebSocket connection immediately closes
- Check auth: the agent expects `Authorization: PocketDev <base64-token>` header
- Use dev mode to bypass auth: `POCKETDEV_DEV_MODE=1`
- Verify device ID matches what was returned from pairing

### Mobile app can't reach agent
- iOS simulator: use `localhost`
- Android emulator: use `10.0.2.2`
- Physical device: use your machine's LAN IP, not `localhost`
- Check firewall allows port 4387
```

> **Important for implementer**: Fill in the exact commands and output after implementing all scripts. Run each script and paste the actual output into the doc. Don't write hypothetical examples — use real ones.

---

## Step 10: Update Root `package.json` Scripts

Add convenience scripts to the root `package.json`:

```json
"test:client": "bun run scripts/test-client.ts",
"test:mock": "bun run scripts/mock-agent.ts",
"test:integration": "bun run scripts/integration-test.ts",
"test:seed": "bun run scripts/seed-dev-db.ts"
```

---

## Verification Checklist

After all steps are complete, verify end-to-end:

1. **Bug fix 1**: `curl -X POST http://localhost:4387/setup/pair -H "Content-Type: application/json" -d '{"code":"...","publicKey":"aa","deviceName":"test"}'` returns 200 with a `deviceId` (not a validation error)
2. **Bug fix 2**: Mobile app can establish WebSocket connection (check agent logs for "Device connected")
3. **Dev mode**: `POCKETDEV_DEV_MODE=1 bun run dev` — agent starts without setup code prompt, WebSocket connects without auth
4. **Test client pair**: `bun run scripts/test-client.ts pair --code <CODE>` succeeds, saves credentials
5. **Test client ws**: `bun run scripts/test-client.ts ws` connects, receives pong
6. **Test client task**: `bun run scripts/test-client.ts task "echo hello" --agent shell` streams output
7. **Mock agent**: `bun run scripts/mock-agent.ts` starts, mobile app can connect and see simulated task output
8. **Seed DB**: `bun run scripts/seed-dev-db.ts` creates DB, agent starts in paired mode
9. **Integration test**: `bun run scripts/integration-test.ts` passes all phases
10. **Docs**: `docs/testing/local-testing-guide.md` exists with all sections filled in
