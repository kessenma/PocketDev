# Reaching a home Mac over Tailscale

A Mac mini at home sits behind your router's NAT, so the phone can't reach
`<public-ip>:4387` like it can with a VPS. Don't port-forward the agent.
Install [Tailscale](https://tailscale.com) on the Mac and the phone instead.
Both join your private tailnet (WireGuard, usually a direct peer-to-peer
connection) and the agent is never exposed to the internet.

## Guided setup (before pairing)

Tailscale setup happens **on the computer, before the phone pairs**. The
phone can't reach a home machine until there's a route to it, and every step
that needs a human (installing the app, approving the system extension,
logging in, enabling HTTPS in the admin console) happens on the computer anyway.
The pairing QR then already contains the Tailscale address, so the phone
pairs once and works everywhere.

There are two entry points, and they share the same checks:

1. **Installer** (`install-macos.sh`). On an interactive run where Tailscale
   isn't connected it asks *"Set up Tailscale now? [Y/n]"*. If yes, it:
   - opens the Standalone app download and waits until it's installed;
   - runs `tailscale up`, opens the login URL, and waits until connected;
   - runs `tailscale serve --bg http://127.0.0.1:<port>`. If HTTPS
     certificates aren't enabled, it opens the consent URL, waits for
     approval and retries.

   You can press `s` at any wait to skip. The agent is bound to `127.0.0.1`
   only if Serve actually works; otherwise it keeps listening on the network
   so Wi‑Fi pairing still works. Non-interactive runs (no `/dev/tty`,
   `POCKETDEV_NONINTERACTIVE=1`, the agent's self-upgrade) never prompt.
   Flags: `--tailscale-serve` (do it without asking), `--no-tailscale`
   (don't offer).
2. **Console → Security → Remote Access** (`RemoteAccessCard.tsx`). This is
   shown first on home or private networks (always on macOS). It asks *"How
   will your phone reach this machine?"*:
   - **From anywhere (recommended):** a live checklist that polls every 5s:
     installed → logged in (*Log in* button returns the login URL) →
     MagicDNS + HTTPS certs → Serve (*Enable* button returns the consent URL
     if needed) → phone has Tailscale → key expiry disabled.
   - **Same Wi‑Fi only:** the QR uses the machine's LAN IP. Tailscale can be
     added later, but that means re-pairing.

API (console session; changing actions require owner/admin):

| Route | What |
|---|---|
| `GET /PocketDev/api/console/tailscale[?refresh=1]` | checklist (`TailscaleSetupStatus` + network summary) |
| `POST /PocketDev/api/console/tailscale/login` | `tailscale up` → `{ actionUrl }` login link, or connected |
| `POST /PocketDev/api/console/tailscale/serve` | `tailscale serve --bg http://127.0.0.1:<port>` → consent `actionUrl` if HTTPS isn't enabled; refuses to overwrite another `:443` handler |
| `DELETE /PocketDev/api/console/tailscale/serve` | `tailscale serve --https=443 off` |

Commands that may block on browser approval are given 15–20s. If a
`login.tailscale.com` URL shows up, it's returned to the user, and the CLI
process keeps running (up to 10 min) so the flow finishes once they approve.

**Phone side** (`ConnectScreen.tsx` + `utils/network-hints.ts`): when pairing
or reconnecting fails with a *network* error, the app explains it based on
the address type:
- `*.ts.net` / `100.64.0.0/10`: "Is Tailscale on?", with *Get Tailscale* and *Retry* buttons.
- LAN address: "Same Wi‑Fi needed" (plus the Android cleartext caveat).
- Loopback: "that's the computer's own address".

Pairing requests time out after 20s so the hint actually appears.

## Manual setup

1. **On the Mac:** install the **Standalone** Tailscale app
   (`https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg`), log in,
   then *Settings → CLI integration → Install*. Turn on *Launch at login*.
2. **On the phone:** install Tailscale and log into the same account.
3. **Admin console** (https://login.tailscale.com/admin): enable **MagicDNS**
   and **HTTPS Certificates** (DNS page), and **Disable key expiry** for the Mac.
4. `tailscale serve --bg http://127.0.0.1:4387`, then open
   `https://<mac>.<tailnet>.ts.net/PocketDev/setup` and pair.

Without Serve it still works: the agent listens on `0.0.0.0` and the QR uses
the tailnet IP (`100.x.y.z:4387`, plain http, still encrypted by WireGuard).
But **passkeys won't work**, and **Android release builds block cleartext**.

## How the agent picks the pairing address

`choosePairingAddress()` in `apps/agent/src/services/system/tailscale.ts`,
used by `GET /PocketDev/api/console/status`:

1. `data/domain.txt` (Linux custom domain + Caddy), unchanged from before.
2. Caddy active (Linux) → request host, port 443, secure.
3. **Tailscale Serve proxying `:443/` to our port** → `<dnsName>:443`, secure.
4. **Tailscale running, no serve** → tailnet IPv4 on the agent port. Only used on
   macOS, or when the console was opened via localhost, so a Linux VPS keeps
   pairing on its public address.
5. Console opened via localhost → the machine's **LAN IPv4** ("same Wi‑Fi only" hint).
6. The `Host` the browser used. If that's unreachable from a phone, the
   console shows a warning under the QR.

Detection runs `tailscale status --json` and `tailscale serve status --json`
(3s timeout, cached for 30s) with `TAILSCALE_BE_CLI=1`. The GUI app binary
otherwise decides whether to start in GUI or CLI mode from its environment.
The agent never changes Tailscale config itself.

## Why `tailscale serve` (and not Caddy)

- Certs for `*.ts.net` are issued and renewed automatically. With
  `tailscale cert` + Caddy you renew the cert files yourself (90-day certs)
  and run an extra daemon on :443.
- Serve keeps the original `Host` header and sets `X-Forwarded-Proto: https`,
  so the WebAuthn RP ID (`webauthn.ts`) comes out as the ts.net name with
  an `https://` origin, which is what passkeys need. **Don't set
  `POCKETDEV_HOSTNAME`** on macOS. The Linux installer hard-codes
  `pocketdev.local`, which would break this.
- WebSockets (`/PocketDev/ws`, `/PocketDev/ws/terminal`) proxy fine over HTTP/1.1.
- Mount at `/` (the default). With `--set-path` Serve strips the mount
  prefix, and the target would have to re-add `/PocketDev`.
- Proxy to `http://127.0.0.1:<port>`, not `localhost`. Tailscale only supports
  127.0.0.1 targets, and `localhost` can resolve to `::1` on macOS.

## Which Tailscale build on macOS

| Variant | CLI | `serve` | Runs before login |
|---|---|---|---|
| **Standalone app** (recommended) | `/usr/local/bin/tailscale` via CLI integration | yes | no |
| Mac App Store app | `/Applications/Tailscale.app/Contents/MacOS/Tailscale` | yes | no |
| Homebrew `tailscaled` (open source) | `/opt/homebrew/bin/tailscale` | yes | yes (LaunchDaemon) |

The agent is a per-user LaunchAgent and only runs after login anyway, so
running Tailscale before login gains nothing. Use the Standalone app plus
auto-login. Homebrew `tailscaled` only makes sense if the agent later becomes
a system daemon, and then you'd need `sudo tailscale set --operator=$USER`.

## Gotchas

- Passkeys are tied to the exact ts.net hostname. Renaming the Mac or the
  tailnet's DNS name invalidates them, so keep a password login as a fallback.
- Machine names with HTTPS certs show up in public Certificate Transparency
  logs. Pick a name you don't mind being public.
- Turn serve off with `tailscale serve --https=443 off` (or `tailscale serve reset`).
  `install-macos.sh --uninstall` resets it if it points at the agent.

## Not done yet (follow-ups)

- Moving an already-paired phone from its LAN address to the Tailscale
  address without re-pairing (an "Enable remote access" item in Workspace
  Tools for people who picked "Same Wi‑Fi only").
- Test with real Tailscale clients (Mac + phone). The flows were exercised
  against a stand-in CLI that mimics `tailscale`'s outputs, but not a real tailnet.
