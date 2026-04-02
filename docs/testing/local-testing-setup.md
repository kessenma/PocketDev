# Local Testing Setup

Use `pnpm local:testing` as the main entry point for local agent testing.

Script reference:
- interactive helper: `scripts/local-testing.js`
- package entry: `pnpm local:testing`

The script itself also points back here for usage and troubleshooting.

## Goal

Use a local PocketDev agent for:

- setup wizard testing
- pairing and auth validation
- connected mobile UI iteration

## Current Product State

Two implementation details matter for local testing:

- The hosted `curl -fsSL https://pocketdev.run/install.sh | bash` flow is still a placeholder today.
- There is no browser page that generates a setup code right now. The setup code is printed in the agent terminal when the agent starts in normal mode with no paired devices.

## Primary Command

Run this from the repo root:

```bash
pnpm local:testing
```

That launches the interactive helper in [local-testing.js](/Users/ke/ws/PocketDev/scripts/local-testing.js), which lets you:

- start a fresh normal pairing flow
- start a fresh dev-mode flow
- reuse existing local agent state
- clear local agent data without starting the server

## Typical Flow

Use the interactive helper for the agent, and manage the mobile app and re.pack metro separately.

### Terminal 1: Start the local agent helper

```bash
pnpm local:testing
```

Recommended choices inside the script:

- `1` for fresh normal pairing flow
- `2` for fresh dev mode

What each mode does:

- Normal mode clears local state if you choose a fresh start, then starts the agent with real pairing enabled.
- Dev mode clears local state if you choose a fresh start, then starts the agent with `POCKETDEV_DEV_MODE=1`.

### Terminal 2: Start re.pack metro

```bash
pnpm dev:mobile
```

### Terminal 3: Launch the mobile app

For iOS:

```bash
pnpm ios
```

For Android:

```bash
pnpm android
```

## Emulator Host Values

Use these values on the mobile connect screen:

- iOS simulator: `localhost`
- Android emulator: `10.0.2.2`
- Port: `4387`

## Setup Code Behavior

In normal mode, the agent prints the setup code directly in the terminal:

```txt
Setup code: ABCD-1234
```

Use that code with the mobile app.

If the agent is already paired, it will print:

```txt
Device already paired. Ready for connections.
```

In that case, choose a fresh normal flow from `pnpm local:testing` so the script clears `apps/agent/data/` first.

## Which Mode To Use

Use normal mode when you want to test:

- first-run setup
- pairing
- auth behavior

Use dev mode when you want to test:

- already-connected screens
- faster iteration after pairing is understood
- flows where setup friction is getting in the way

## Troubleshooting

### No setup code appears

- Use `pnpm local:testing`
- Choose `1` for a fresh normal pairing flow
- The setup code is terminal output today, not a browser flow

### Mobile cannot reach the agent

- iOS simulator should use `localhost`
- Android emulator should use `10.0.2.2`
- Confirm the agent is listening on port `4387`

### Setup code does not work

- Confirm you started normal mode, not dev mode
- Confirm the code is entered in `ABCD-1234` format
- Setup codes expire after 15 minutes

### WebSocket closes immediately

- Retry with dev mode from `pnpm local:testing`
- If dev mode works and normal mode does not, the issue is likely in pairing or auth state
