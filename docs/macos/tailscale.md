# Reaching a home Mac over Tailscale

A Mac mini at home sits behind your router's NAT, so the phone can't reach
`<public-ip>:4387` like it can with a VPS. Don't port-forward the agent.
Install [Tailscale](https://tailscale.com) on the Mac and the phone instead.
Both join your private tailnet (WireGuard, usually a direct peer-to-peer
connection) and the agent is never exposed to the internet.

## Recommended setup

1. **On the Mac:** install the **Standalone** Tailscale app
   (`https://pkgs.tailscale.com/stable/Tailscale-latest-macos.pkg`), log in,
   then *Settings → CLI integration → Install* so `/usr/local/bin/tailscale`
   exists. Turn on *Launch at login*.
2. **On the phone:** install Tailscale and log into the same account.
3. **Admin console** (https://login.tailscale.com/admin):
   - DNS → enable **MagicDNS** and **HTTPS Certificates**.
   - Machines → the Mac → **Disable key expiry** (otherwise it drops off every 180 days).
4. **Install the agent with HTTPS on the tailnet:**
   ```bash
   curl -fsSL https://pocketdev.run/install-macos.sh | bash -s -- --tailscale-serve
   ```
   This binds the agent to `127.0.0.1` and runs
   `tailscale serve --bg http://127.0.0.1:4387`, so
   `https://<mac>.<tailnet>.ts.net/` proxies to the agent.
5. Open `https://<mac>.<tailnet>.ts.net/PocketDev/setup` and pair. The QR
   will say `{host: <mac>.<tailnet>.ts.net, port: 443, secure: true}`, and the
   app talks `https://` / `wss://`.

Without `--tailscale-serve` it still works: the agent listens on `0.0.0.0`
and the QR uses the Mac's tailnet IP (`100.x.y.z:4387`, plain http). That
traffic is still encrypted by WireGuard, but there are two limits:
**passkeys don't work** (WebAuthn needs HTTPS and a domain), and **Android
release builds block cleartext** HTTP.

## How the agent picks the pairing address

`choosePairingAddress()` in `apps/agent/src/services/system/tailscale.ts`,
used by `GET /PocketDev/api/console/status`:

1. `data/domain.txt` (Linux custom domain + Caddy), unchanged from before.
2. Caddy active (Linux) → request host, port 443, secure.
3. **Tailscale Serve proxying `:443/` to our port** → `<dnsName>:443`, secure.
4. **Tailscale running, no serve** → tailnet IPv4 on the agent port. Only used on
   macOS, or when the console was opened via localhost, so a Linux VPS keeps
   pairing on its public address.
5. The `Host` the browser used. If that's loopback, the console shows a
   warning under the QR ("your phone can't reach this").

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

- A console button to enable or disable Serve (`tailscale serve --bg --yes …`)
  that shows the consent URL, instead of re-running the installer.
- Mobile: clearer connection errors for `*.ts.net` / `100.x` hosts
  ("Is Tailscale connected on this phone?"), and offering to re-pair when a
  server moves from http to https.
- Verify on a real phone and tailnet. The logic is unit-tested, but the full
  path hasn't been run end to end.
