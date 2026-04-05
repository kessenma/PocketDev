# Agent Preview Proxy

## Overview

The preview proxy tunnels dev server output through the agent, allowing mobile and console to preview running web applications via the PocketDev server.

**Source**: `apps/agent/src/services/proxy.ts`

## Two Proxy Modes

### 1. Direct Preview (`/PocketDev/preview/*`)

Simple reverse proxy to `localhost:{devServerPort}`:
- No session required
- Port auto-detected from task output (default: 5173)
- Used for quick preview access

### 2. Browser Sessions (`/PocketDev/browser/session/:sessionId/*`)

Managed preview sessions with HTML rewriting:
- Created via `POST /api/browser/sessions`
- Target URL validation (localhost only)
- HTML rewriting for correct asset paths
- 30-minute TTL
- Used by mobile preview feature and console

## Dev Server Port Detection

```typescript
detectDevServerPort(line: string): number | null
```

Scanned on every task output line. Patterns (checked in order):

1. `https?://(?:localhost|127.0.0.1|0.0.0.0):(\d+)` — Direct URL match
2. `/listening on (?:port )?(\d+)/i` — Generic listen log
3. `/server (?:running|started) (?:at|on) .*?:(\d+)/i` — Server start log

Default port: `POCKETDEV_DEV_PORT` env or `5173`.

## Browser Session Flow

```
Mobile App                Agent Server                Dev Server
    │                         │                          │
    │  POST /api/browser/     │                          │
    │  sessions               │                          │
    │  { target_url }         │                          │
    │────────────────────►    │                          │
    │                         │  Validate localhost       │
    │                         │  Generate sessionId       │
    │   { session_id,         │                          │
    │     proxied_url }       │                          │
    │◄────────────────────    │                          │
    │                         │                          │
    │  GET /browser/session/  │                          │
    │  {id}/                  │                          │
    │────────────────────►    │                          │
    │                         │  Fetch from target       │
    │                         │────────────────────►     │
    │                         │   HTML response          │
    │                         │◄────────────────────     │
    │                         │  Rewrite HTML            │
    │   Rewritten HTML        │  (base tag + URLs)       │
    │◄────────────────────    │                          │
```

## HTML Rewriting

For the session root request, HTML is rewritten to fix asset paths:

1. Insert `<base href="/PocketDev/browser/session/{sessionId}/">` in `<head>`
2. Rewrite root-relative URLs:
   - `href="/path"` → `href="/PocketDev/browser/session/{sessionId}/path"`
   - `src="/api/..."` → `src="/PocketDev/browser/session/{sessionId}/api/..."`
3. Handle Vite-specific assets (`@vite`, `sockjs`)

Sub-path requests are proxied without rewriting.

## Request Sanitization

Proxy headers cleaned before forwarding:
- Removed: `host`, `connection`, `transfer-encoding`, `authorization`
- All other headers preserved

## Routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/browser/sessions` | Required | Create browser session |
| ALL | `/browser/session/:sessionId` | None | Proxy root (HTML rewrite) |
| ALL | `/browser/session/:sessionId/*` | None | Proxy sub-paths |
| ALL | `/preview/*` | None | Direct proxy to dev server |

## Mobile Preview Store Integration

The mobile `preview` store:
1. Calls `openPreview(targetUrl)` → creates session via REST
2. Receives `proxiedUrl` (the rewritten URL through the agent)
3. Loads `proxiedUrl` in a WebView
4. Tracks load status: `idle` → `connecting` → `loaded` / `failed`
