# App Store setup on a Mac host (Xcode + `asc`)

On a Mac host, **Settings → Workspace Tools** in the mobile app has an
optional **App Store** section. It gets the Mac ready for agents to archive,
sign and upload iOS apps to TestFlight / App Store Connect, so a task like
*"fix the crash in the review screen and upload a TestFlight build"* can run
end to end from the phone.

- **macOS only.** On Linux, `GET /apple-setup/status` returns
  `supported: false` and the section isn't shown. (`asc` itself runs on
  Linux, but building and signing need Xcode.)
- **Optional.** The `xcode` and `asc_cli` rows in the prerequisites report
  have `required: false` and never affect the workspace's `ready`.
- Public page: `apps/docs/src/routes/ios-developers.tsx` ("Shipping iOS Apps").

Code: `apps/agent/src/services/cli-setup/apple-setup.ts` (detection, commands,
key handling), `apps/agent/src/routes/apple-setup.ts` (HTTP),
types in `packages/shared/src/types/setup.ts` (`Apple*`).

## The flow

Every step that needs a secret (sudo, Apple Account password, 2FA code) runs
in the app's **setup terminal**. `asc`, `xcodes` and `sudo` read the secret
from the PTY, so it never passes through the agent process, a command line,
or shell history. The terminal sets
`SUDO_PROMPT='[sudo] password for %p: '` on macOS (`services/terminal/terminal.ts`).
macOS's default `Password:` prompt would otherwise go unnoticed by the app's
sudo sheet.

### 1. Xcode

Detection (`checkXcode()`):

| Check | How |
|---|---|
| installed | `/Applications/Xcode*.app` exists. Picked in this order: the selected one → `/Applications/Xcode.app` → newest non-beta |
| selected | `xcode-select -p` points inside that app, not at `/Library/Developer/CommandLineTools` |
| beta | app name contains "beta", or `ProductBuildVersion` ends in a lowercase letter (`17A5241e`) |
| license accepted | `xcodebuild -license check` (with `DEVELOPER_DIR` set to the app) |
| first launch done | `xcodebuild -checkFirstLaunchStatus` |
| iOS platform | `xcodebuild -showsdks -json` has an `iphoneos` SDK |

Xcode counts as ready when it's installed, selected, licensed and **not beta**.
A beta Xcode can build, but App Store Connect rejects what it produces.

If Xcode is missing, the user picks an install route:

- **Mac App Store**: `brew install mas` (if needed), `sudo -v`,
  `mas get 497799835`. The Mac must be signed in to the App Store, and
  Apple may show a confirmation on the Mac's screen.
- **Direct download from developer.apple.com** with
  [xcodes](https://github.com/XcodesOrg/xcodes): installs `xcodes` + `aria2`
  via brew, `sudo -v`, then
  `xcodes install --latest --experimental-unxip --empty-trash`. The Apple
  Account password and 2FA code go into xcodes' terminal prompts.
  `xcodes signout` runs afterwards (even on failure) to remove the password
  xcodes saves in the Keychain. `POST /apple-setup/xcodes-command` can prefill
  `XCODES_USERNAME`.

**Finish step** (only the parts that are needed, joined with `&&`):

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
# and, if the iOS platform is missing:
DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer xcodebuild -downloadPlatform iOS
```

### 2. `asc` CLI

[`asc`](https://github.com/rorkai/App-Store-Connect-CLI) is an open-source
(MIT), **unofficial** CLI for the App Store Connect API. It isn't made by
or affiliated with Apple. Installed with its own script, which verifies a
checksum and puts the binary in `~/.local/bin`:

```bash
curl -fsSL https://asccli.sh/install | bash
```

Lookup order: `~/.local/bin/asc`, `/opt/homebrew/bin/asc`,
`/usr/local/bin/asc`, then `command -v asc`. A brew install is picked up too.

`asc` sends pseudonymous usage telemetry by default (command names, versions,
outcome; per its README, no credentials, app/bundle/team IDs, paths or
arguments). The wizard shows the current state (`asc telemetry status`) and a
switch for `POST /apple-setup/telemetry` → `asc telemetry enable|disable`.

### 3. Apple account (API key)

Agents authenticate with an **App Store Connect team API key** (`.p8`), not
the user's Apple Account. There are two ways to get one onto the Mac.

**a) Create a key for me** (`POST /apple-setup/create-key-command`, then `POST /apple-setup/finish-key`)

1. The app sends the Apple Account email, a role (default `ADMIN`; `APP_MANAGER`
   offered as the narrower option) and an optional key name (default
   `PocketDev <short hostname>`).
2. The agent returns a command, which the app runs in the setup terminal:
   ```bash
   ASC_WEB_DONT_STORE_PASSWORD=1 asc web api-keys create --apple-id 'me@example.com' \
     --name 'PocketDev mac-mini' --role ADMIN --output-dir ~/.asc/keys \
     --output json > ~/.asc/keys/.pocketdev-create.json && echo 'PocketDev: API key created.'
   ```
   `asc` prompts for the password and 2FA code (the app shows its secure prompt
   sheet). `ASC_WEB_DONT_STORE_PASSWORD=1` stops asc from saving the password.
   The account must be **Account Holder or Admin** on the team. asc writes
   `AuthKey_<KEY_ID>.p8` (0600). The JSON on stdout holds the key ID, issuer ID
   and `.p8` path, never the key itself.
3. `finish-key` reads that JSON and registers the key (see below). It then runs
   `asc web auth logout --apple-id …` so no Apple web session stays cached, and
   deletes `.pocketdev-create.json` and `.pocketdev-apple-id`.

**b) Use an existing key** (`POST /apple-setup/import-key`)

The user picks `AuthKey_XXXXXXXXXX.p8` on the phone and enters the Issuer ID
(App Store Connect → Users and Access → Integrations). The agent validates the
input: Key ID is 10 chars `[A-Z0-9]`, Issuer ID is a UUID, the file is a PEM
`PRIVATE KEY` under 4 KB. It writes the file to `~/.asc/keys/AuthKey_<ID>.p8`
(dir 0700, file 0600) and registers it. If App Store Connect rejects the key,
the file is deleted again.

**Registering** (both paths, `ascLogin()`):

```bash
asc auth login --name pocketdev --key-id KEY --issuer-id ISSUER --private-key ~/.asc/keys/AuthKey_KEY.p8 --network
asc auth switch --name pocketdev
```

`--network` makes asc check the key against Apple before saving it. asc
stores the credential in the **macOS login Keychain**, including encrypted
key material, so asc keeps working even if the `.p8` file is removed later.

**Why Admin by default:** Xcode's automatic (cloud-managed) signing with an
API key (`-allowProvisioningUpdates -authenticationKey…`) needs it. App
Manager can upload and manage TestFlight, but may not cover certificate and
profile changes. The `DEVELOPER` role is accepted by the API, but the app
doesn't offer it.

### 4. Verify (`POST /apple-setup/verify`)

`asc auth status --validate` plus `asc apps list --limit 50 --output json`.
The app shows the team's apps. `status.ready` = Xcode ready + asc installed + a
profile configured whose last validation wasn't `failed`.

The status also reports `signing_identities` (count from
`security find-identity -v -p codesigning`), which is for information only.

## What agents see

Once `asc` is installed and signed in, the generated `~/.claude/CLAUDE.md`
(`buildServerClaudeMd()` → `appleClaudeMdLines()`) gets an **App Store
Connect** section. It says that asc is signed in (profile `pocketdev`, in the
Keychain) and whether Xcode is ready, and tells agents to:

- prefer the project's own deploy script (`scripts/deploy.py`, fastlane lanes) when there is one;
- otherwise use `asc xcode archive` → `asc xcode export` → `asc builds upload`, checking `asc <command> --help` for flags;
- **ask before submitting for App Review or releasing**. Uploading to TestFlight is fine when the task asks for it.

## API

All routes require the device's normal `Authorization` header. Registered
alongside the other `*-setup` routes in `apps/agent/src/index.ts`.

| Route | What |
|---|---|
| `GET /apple-setup/status[?validate=1]` | `AppleSetupStatus`: xcode / asc / account / signing_identities / commands / ready. `validate=1` runs `asc auth status --validate` (network, ~30s timeout) |
| `POST /apple-setup/xcodes-command` `{ apple_id? }` | `{ command }`: the xcodes install command, with `XCODES_USERNAME` if the email is valid |
| `POST /apple-setup/telemetry` `{ enabled }` | `asc telemetry enable\|disable` → status |
| `POST /apple-setup/create-key-command` `{ apple_id, role?, key_name? }` | `{ command, key_name, role }` to run in the setup terminal; 400 on a bad email or missing asc |
| `POST /apple-setup/finish-key` | read the create result, `asc auth login` + `switch`, `asc web auth logout` → `AppleKeyResult` |
| `POST /apple-setup/import-key` `{ key_id, issuer_id, private_key }` | validate, write `.p8`, `asc auth login` → `AppleKeyResult` (400 on failure) |
| `POST /apple-setup/verify` | validate + `asc apps list` → `AppleVerifyResult` |

`finish-key`, `import-key` and `verify` invalidate the prerequisites cache,
so the Workspace Tools rows and `CLAUDE.md` update.

## Where things are stored

| What | Where |
|---|---|
| `asc` binary | `~/.local/bin/asc` |
| API key file | `~/.asc/keys/AuthKey_<KEY_ID>.p8` (dir 0700, file 0600) |
| asc credential (profile `pocketdev`) | macOS login Keychain, managed by asc |
| asc settings / web-session cache | `~/.asc/` (`config.json`, `web/`). The web session is removed after key creation |
| Temporary create state | `~/.asc/keys/.pocketdev-create.json`, `.pocketdev-apple-id`, deleted by `finish-key` |
| Apple Account password | not stored (asc: `ASC_WEB_DONT_STORE_PASSWORD=1`; xcodes: `xcodes signout`) |
| Agent instructions | `~/.claude/CLAUDE.md` (App Store Connect section) |

PocketDev's own database stores none of this.

## Security notes

- The `.p8` is a team-wide credential. With the Admin role it can do
  almost anything in App Store Connect except Account Holder actions. Anyone
  with shell access to the Mac (which includes every agent task) can use it.
  Treat a PocketDev Mac with a key like a CI machine that can publish.
- Use **one key per Mac** (the default name includes the hostname), so revoking one
  machine doesn't break others.
- Apple only lets you **download a `.p8` once**. "Create a key for me" writes
  it straight to the Mac. Keep a copy somewhere safe if you'll need it
  elsewhere, or just create another key later.
- The import path sends the `.p8` from the phone to the agent over the
  normal authenticated connection. It's written once to disk and never logged
  or echoed.
- **Distribution certificates are limited per team** by Apple, and a cert's private key
  can't be downloaded again. The setup prefers Xcode automatic signing over
  creating certificates, and creates no certificates itself.
- The CLAUDE.md guidance (ask before App Review / release) is an instruction
  to the agent, not an enforced permission. The key's role is the real boundary.

## Manual equivalent

Run these in Terminal on the Mac, as the user the agent runs as:

```bash
# Xcode (after installing it from the App Store or with xcodes)
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
sudo xcodebuild -runFirstLaunch
xcodebuild -downloadPlatform iOS        # if the iOS platform is missing

# asc
curl -fsSL https://asccli.sh/install | bash
asc telemetry disable                   # optional

# create a key (Account Holder / Admin), or download one from
# App Store Connect → Users and Access → Integrations → Team Keys
mkdir -p ~/.asc/keys && chmod 700 ~/.asc/keys
ASC_WEB_DONT_STORE_PASSWORD=1 asc web api-keys create --apple-id you@example.com \
  --name "PocketDev $(hostname -s)" --role ADMIN --output-dir ~/.asc/keys

asc auth login --name pocketdev --key-id KEY --issuer-id ISSUER \
  --private-key ~/.asc/keys/AuthKey_KEY.p8 --network
asc auth switch --name pocketdev
asc web auth logout --all

# verify
asc auth status --validate
asc apps list
```

Then tap **Verify** in the app, or restart the agent, so the prerequisites
report and `CLAUDE.md` pick it up.

**Undo:**

```bash
asc auth logout --name pocketdev --confirm     # removes the Keychain entry + config
rm ~/.asc/keys/AuthKey_<KEY_ID>.p8
```

Then revoke the key in App Store Connect → Users and Access → Integrations.
Revoking is what actually stops it from working. Deleting the local copy
alone doesn't.

## Troubleshooting

- **"Xcode isn't selected"** / builds use the Command Line Tools:
  `xcode-select -p` shows `/Library/Developer/CommandLineTools`. Run the finish
  step, or `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- **Beta Xcode:** detected from the app name or the build number. Install the
  release Xcode next to it and select that one. Keep betas under a name that
  says so (`Xcode-beta.app`). Builds from a beta toolchain are rejected by App
  Store Connect.
- **"Account Holder or Admin access is required"** while creating a key: the
  Apple Account doesn't have that role on the team. Have the Account Holder
  create the key (or give you Admin), then use *Use an existing key*.
- **Several teams:** `asc web api-keys create` uses the session's default
  provider. Use `--public-provider-id TEAM_ID` when running it manually.
- **2FA code never arrives / no trusted Apple device nearby:** asc defaults to
  `--two-factor-method auto`. Run the create command manually in the setup
  terminal with `--two-factor-method sms` (or `ASC_WEB_2FA_METHOD=sms`). Use
  `--two-factor-phone-id` if the account has several numbers.
- **"No new key was found"** after the terminal step: the create command failed
  or was cancelled, so `.pocketdev-create.json` is missing or empty. Check the
  terminal output and run the step again. If a key *was* created but
  registering it failed, the error includes its Key ID. The `.p8` is still in
  `~/.asc/keys`, so use *Use an existing key* or `asc auth login` by hand.
- **Too many keys / key names:** every run of "Create a key for me" creates a
  new team key. Revoke old ones in App Store Connect → Users and Access →
  Integrations.
- **Validation `failed` after it used to work:** the key was revoked, or its
  role changed. Create or import a new one.
- **Keychain locked / asc says "no credentials" after a reboot:** the login
  Keychain is unlocked by a GUI login. The agent is a LaunchAgent, so it only
  runs after a login anyway. With auto-login on, that happens by itself. A
  **FileVault** Mac can't auto-login, so someone must log in after each reboot
  (see [README.md](README.md#making-a-mac-mini-behave-like-a-server)). For a
  truly headless setup, asc supports `--bypass-keychain` (credentials in
  `~/.asc/config.json`, 0600). The wizard doesn't use it.
- **Automatic signing fails with an App Manager key:** try an Admin key, or
  install the team's existing distribution identity (`.p12`) in the login
  Keychain.
- **`asc xcode validate` can't find the key:** it shells out to `altool`, which
  only looks in `~/.appstoreconnect/private_keys/`. Symlink the `.p8` there.
- **App Store install route hangs:** the Mac isn't signed in to the App Store,
  or Apple is waiting for a confirmation on the Mac's screen. Use the
  developer.apple.com route instead.
