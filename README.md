# PocketDev

**Control AI coding agents from your phone. No laptop required.**

Install on any Linux VPS, pair your phone, and run Claude, Codex, or Copilot from anywhere — over a direct, encrypted connection with no cloud middleman.

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL_1.1-blue.svg)](LICENSE)
[![iOS](https://img.shields.io/badge/iOS-App_Store-black?logo=apple)](https://pocketdev.run)
[![Android](https://img.shields.io/badge/Android-coming_soon-3DDC84?logo=android)](https://pocketdev.run)

---

## Why PocketDev?

Other mobile AI coding tools route your prompts through a third-party server (Telegram bot, hosted relay, etc.). PocketDev is different:

- **Your server, your code.** The agent runs on your own VPS. Nothing leaves your infrastructure except what you send.
- **Direct connection.** Your phone talks to your server over WebSocket with Ed25519 device authentication — no relay, no intermediary.
- **$5/mo workflow.** A cheap DigitalOcean or Hetzner VPS is all you need. No expensive cloud AI subscription required on top.
- **Full dev environment control.** Run scripts, browse files, manage git, watch live output — not just a chat box.

---

## Features

- **Task streaming** — Start Claude/Codex/Copilot tasks, watch output line-by-line, kill when done
- **Interactive terminal** — Full PTY shell session from your phone
- **Git workspace** — Stage changes, commit, push/pull, diff files, resolve conflicts with AI help
- **Script runner** — Run package.json scripts, see live output, open dev server previews
- **File browser** — Browse, read, and edit files on your server
- **Dev preview** — Proxied access to your running dev server
- **Docker** — View and manage containers
- **Secure pairing** — One-time QR code setup, Ed25519 keypair auth after

---

## Architecture

```
[ Mobile App (iOS / Android) ]
          |
    WebSocket + HTTPS
    Ed25519 signed frames
          |
[ PocketDev Agent (your VPS) ]
          |
   ┌──────┴──────┐
   │             │
[Claude]    [Filesystem]
[Codex]     [Git / Scripts]
[Copilot]   [Docker]
```

No relay. No third-party access to your code. The agent is a single Bun process on port 4387.

---

## Quick Install

On your Linux server:

```bash
curl -fsSL https://pocketdev.run/install.sh | bash
```

Then download the mobile app, scan the QR code shown in your terminal, and you're paired.

---

## Self-Hosting

The agent is designed to run on any Linux VPS with Bun installed. See [apps/agent/CLAUDE.md](apps/agent/CLAUDE.md) for full setup docs.

```bash
# Clone and run manually
git clone https://github.com/kessenma/pocketdev
cd pocketdev/apps/agent
bun install
bun run src/index.ts
```

Environment variables:

| Variable | Default | Description |
|---|---|---|
| `POCKETDEV_PORT` | `4387` | Agent port |
| `POCKETDEV_DATA_DIR` | `./data/` | SQLite DB location |
| `POCKETDEV_PROJECT_DIR` | `$HOME` | Base directory for file operations |
| `POCKETDEV_DEV_PORT` | `5173` | Dev server port for preview proxy |

---

## Project Structure

```
apps/web/       Landing page + install script (TanStack Start)
apps/agent/     Server agent — install this on your VPS (Bun + Elysia)
apps/mobile/    iOS + Android app (React Native + Re.Pack)
packages/shared/ Wire protocol types, theme tokens, crypto
packages/db/    Web app PostgreSQL schema (Drizzle)
```

---

## Contributing

Contributions welcome. A few areas where community help would be valuable:

- Additional git host integrations (Codeberg, Gitea, self-hosted GitLab)
- Android polish and testing
- Agent installation improvements (systemd service, auto-update)
- Additional AI provider support

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup instructions, PR guidelines, and areas where help is most needed.

---

## License

PocketDev is source-available under the [Business Source License 1.1](LICENSE).

**What this means:**
- Free to use for personal development and self-hosting
- Free to modify and contribute back
- Cannot be used to build a competing commercial product or publish a fork to any app store
- Converts to MIT License four years after each release

For commercial licensing inquiries, contact kyle@pocketdev.run.
