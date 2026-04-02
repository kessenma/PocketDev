# Phase 5: Polish + Production Hardening

**Goal**: HTTPS support, robust reconnection, push notifications, multi-agent support, git integration, and production readiness.

**Session**: Start a new Claude Code chat. Reference `CLAUDE.md`.

---

## Prerequisites

- Phase 4 complete (full loop working: pair, task, stream, review, approve/reject)
- A domain name pointed at the server (optional, IP-only mode is fine)

---

## Steps

### 1. HTTPS + custom domain

**Option A — Custom domain**:
- Add Caddy as a reverse proxy in the agent's Docker compose
- Caddy auto-provisions Let's Encrypt certificates
- User provides domain during install, Caddy handles TLS

**Option B — IP-only (self-signed + pinning)**:
- Agent generates a self-signed certificate on first boot
- During pairing, mobile app receives and stores the certificate fingerprint
- All subsequent connections verify the pinned certificate
- No CA trust required

**Implementation**:
- `apps/agent/src/tls.ts` — certificate generation + loading
- Update Docker compose to include Caddy (optional service)
- Update install script to ask: "Do you have a domain? (y/N)"

### 2. Reconnection protocol

**Server-side event buffer**:
- Agent maintains a circular buffer of last 1000 events per device (or 5 minutes, whichever is smaller)
- Each event has a sequential `eventId`

**Client-side reconnection**:
- On WebSocket disconnect, mobile stores `lastEventId`
- On reconnect, sends `{ lastEventId }` in the auth handshake
- Server replays missed events from the buffer
- If buffer doesn't go back far enough, server sends a `sync.full` event (mobile refreshes all state)

**Mobile implementation**:
- Exponential backoff: 1s, 2s, 4s, 8s, max 30s
- Offline indicator banner at top of screen
- Automatic reconnect on network change (WiFi -> cell, etc.)
- On foreground: immediate reconnect attempt

### 3. Push notifications

**Agent-side**:
- When mobile is disconnected but a task completes, queue a notification
- Use a lightweight push service (Firebase Cloud Messaging via the web app as a relay, or direct APNs)

**Mobile-side**:
- Register for push notifications during pairing
- Store push token on agent
- Notification types: task completed, task failed, changes ready for review

**Web app relay** (if using FCM):
- `POST /api/push` endpoint on the web app
- Agent calls this when it needs to send a push
- Web app forwards to FCM/APNs
- Requires push token registration in Postgres (extend schema)

### 4. Multi-agent support

**Agent abstraction** (`apps/agent/src/services/agents/`):
- `BaseAgent` interface: `start(prompt)`, `kill()`, `getStatus()`
- `ClaudeAgent` — wraps `claude` CLI
- `CodexAgent` — wraps `codex` CLI (when available)
- `ShellAgent` — wraps arbitrary shell commands

**Mobile updates**:
- Agent picker on NewTaskScreen (already has `agentTypeEnum`)
- Per-agent configuration (model selection for Claude, etc.)
- Agent availability detection (agent server reports which CLIs are installed)

### 5. Multi-project support

**Agent-side**:
- Support multiple project directories
- Each project has its own file watcher, task history, and working directory
- `projects` SQLite table: id, name, path, created_at

**Mobile-side**:
- Project switcher (dropdown or tab)
- Project management screen (add/remove project paths)
- Tasks and file changes scoped to current project

### 6. Git integration

**Agent-side**:
- `git.status` — current branch, clean/dirty, ahead/behind
- `git.log` — recent commit history
- `git.commit` — create a commit with a message (from mobile)
- `git.diff` — show uncommitted changes

**Mobile-side**:
- Git panel accessible from task detail or settings
- Current branch display in header
- Commit button with message input
- Commit history list

### 7. Web app dashboard (optional)

Extend the web app beyond the landing page:
- Install analytics dashboard (chart of installs over time)
- Active server count (agents that have phoned home)
- This is a stretch goal — only if there's demand

### 8. Production hardening

- Rate limiting on all agent endpoints
- Request size limits
- Input sanitization on task prompts (prevent shell injection in shell mode)
- Graceful shutdown handling
- Log rotation for SQLite task_logs (prune old entries)
- Health check endpoint used by Docker
- Update install script to final production version

### 9. Verify

1. **HTTPS**: Access agent over `https://your-domain:4387` — valid certificate
2. **Reconnection**: Kill WebSocket, wait 30s, reconnect — no missed output
3. **Push**: Background the app, complete a task — push notification arrives
4. **Multi-agent**: Switch between Claude and Shell, both work
5. **Multi-project**: Add two project directories, tasks are scoped correctly
6. **Git**: View branch, create a commit from the phone
7. **Stability**: Use the app for 1 hour without crashes or hangs

---

## CLAUDE.md Updates

After this phase:
- Document HTTPS setup options
- Update security model section with TLS details
- Add push notification configuration
- Document multi-project setup
- Mark project as "beta" status

---

## Commit

```
phase 5: https, reconnection, push notifications, multi-agent, git integration

- caddy reverse proxy for auto-tls (custom domain) + self-signed with pinning (ip-only)
- event buffer + replay for lossless reconnection
- push notifications via fcm relay
- pluggable agent abstraction (claude, codex, shell)
- multi-project support with scoped tasks
- git status, log, commit from mobile
- rate limiting, input sanitization, production hardening
```
