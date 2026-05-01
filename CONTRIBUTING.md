# Contributing to PocketDev

Thanks for taking the time to contribute — it genuinely means a lot.

PocketDev is a solo-built project, so reviews may take a few days. The best way to get something merged quickly is to open an issue first so we can align before you invest time writing code.

## Table of Contents

1. [Before You Start](#1-before-you-start)
2. [Setup Development Environment](#2-setup-development-environment)
3. [Fork and Clone](#3-fork-and-clone)
4. [Run Locally](#4-run-locally)
5. [Create a Pull Request](#5-create-a-pull-request)
6. [Contribution Guidelines](#6-contribution-guidelines)

---

## 1. Before You Start

**Open an issue first** for any non-trivial change — a new feature, a refactor, or an integration. This avoids duplicate work and lets us discuss approach before you write a line of code. Bug fixes and typos can go straight to a PR.

Good areas for contributions right now:
- Additional git host integrations (Codeberg, Gitea, self-hosted GitLab)
- Android polish and testing
- Additional AI provider support
- Agent installation improvements (systemd service hardening)
- Bug fixes

---

## 2. Setup Development Environment

**Prerequisites:**

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Bun | 1.x | `curl -fsSL https://bun.sh/install \| bash` |
| pnpm | 9+ | `npm install -g pnpm` |
| Docker | any recent | [docs.docker.com/engine/install](https://docs.docker.com/engine/install) |

**For mobile development (optional):**

| Tool | Notes |
|------|-------|
| Xcode 15+ | iOS builds (macOS only) |
| Android Studio | Android builds |
| Rock CLI | `npm install -g @rocketseat/cli` |

---

## 3. Fork and Clone

1. Fork the [PocketDev repository](https://github.com/yourusername/pocketdev) on GitHub.
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/pocketdev
   cd pocketdev
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Copy environment files:
   ```bash
   cp apps/agent/.env.example apps/agent/.env    # if present
   cp apps/web/.env.example apps/web/.env        # if present
   ```

---

## 4. Run Locally

### Agent + sample app (Docker — recommended)

The fastest way to get a working agent is Docker Compose. This spins up the agent with hot reload and a sample Vite app to test against:

```bash
docker compose -f docker-compose.dev.yml up
```

- Agent: `http://localhost:4387`
- Sample app (preview proxy target): `http://localhost:5173`

### Agent only (bare Bun)

```bash
cd apps/agent
bun install
bun --watch src/index.ts
```

### Full local testing with mobile

See [docs/testing/local-testing-setup.md](docs/testing/local-testing-setup.md) for the complete flow. The short version:

```bash
# Terminal 1 — agent
pnpm local:testing

# Terminal 2 — Re.Pack metro bundler
pnpm dev:mobile

# Terminal 3 — launch app
pnpm ios       # or: pnpm android
```

### Web app

```bash
pnpm dev:web   # http://localhost:3000
```

### Type checking

```bash
pnpm check-types
```

---

## 5. Create a Pull Request

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
2. Make your changes. Run type checks before pushing:
   ```bash
   pnpm check-types
   ```
3. Push and open a PR against `main`.
4. Fill in the PR description:
   - What does this change do?
   - Why is it needed?
   - How did you test it?
   - Link to the related issue (`Closes #123`)
   - Screenshot or recording if it touches UI

PRs without a linked issue (for non-trivial changes) or without testing notes may be closed and asked to reopen after those are added.

---

## 6. Contribution Guidelines

### Code style
- Match the patterns you see in the file you're editing
- No new comments unless the *why* is non-obvious
- Mobile: `StyleSheet.create()` + tokens from `@pocketdev/shared/theme` — no inline styles
- Web: shadcn/ui components first, raw HTML/Tailwind only when nothing fits
- New shared types go in `packages/shared/src/types/`, new schemas in `packages/shared/src/schema/`

### PR guidelines
- **One PR, one concern.** Don't bundle a feature with a refactor.
- **Target `main`.** PRs against other branches will be redirected.
- **Descriptive titles.** `fix: terminal session not cleaning up on disconnect` beats `Fix bug`.
- **No AI-generated code without review.** If you used an AI tool, make sure you understand every line and have tested it yourself. Untested AI output will be rejected.
- **Breaking changes need discussion.** Anything that changes the wire protocol, agent API shape, or pairing flow should be discussed in an issue first — those changes affect all paired devices.

### Security
If you find a security vulnerability, please **do not open a public issue**. Email kyle@pocketdev.run directly with details.
