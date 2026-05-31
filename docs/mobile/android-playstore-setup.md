# Android Play Store Setup

Reference doc for setting up Fastlane + Play Store publishing for Android, mirroring the existing iOS TestFlight pipeline.

## Status

**Blocked** — requires an Android device to activate the Google Play Developer account.

When the account is activated, complete the prerequisites below then run the code setup.

---

## Prerequisites (manual — do these first)

### 1. Fix the application ID

The current `applicationId` is `com.mobile` (placeholder). Change it to `run.pocketdev.mobile` to match the iOS bundle ID before creating the Play Console listing.

Files to update:
- `apps/mobile/android/app/build.gradle` — `namespace` and `applicationId`
- `apps/mobile/android/app/src/main/java/com/mobile/` — rename package directory and update imports in `MainApplication.kt` / `MainActivity.kt`

### 2. Generate a release keystore (once — back it up)

```bash
keytool -genkey -v \
  -keystore ~/pocketdev-release.keystore \
  -alias pocketdev \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```

**This file cannot be re-created.** Store it and its passwords somewhere safe (1Password, etc.) outside the repo. If you lose it you cannot update the app on the Play Store.

### 3. Create the app in Play Console

- Google Play Console → Create app
- Package name: `run.pocketdev.mobile`
- Complete the app listing (title, description, screenshots, etc.)
- The listing must exist before Fastlane can upload builds

### 4. Create a Google Play service account

1. Play Console → Setup → API access → Link to a Google Cloud project
2. Google Cloud Console → IAM & Admin → Service Accounts → Create service account → Download JSON key
3. Back in Play Console → Grant the service account **Release Manager** role
4. Save the JSON key somewhere safe outside the repo (e.g. `~/pocketdev-play-key.json`)

---

## Code Changes (to implement when prerequisites are done)

### A. `apps/mobile/android/app/build.gradle`

- Change `namespace` and `applicationId` to `run.pocketdev.mobile`
- Add Gradle helper functions to read `versionCode` / `versionName` from `../../ios-version.json` (keeps iOS + Android versions in sync)

### B. `apps/mobile/android/fastlane/` (new directory)

**`Fastfile`** — Android lanes mirroring the iOS Fastfile:
- `internal` — build AAB + upload to internal testing track
- `beta` — build AAB + upload to open testing track
- `release` — build AAB + upload to production track

Each lane: reads version from `ios-version.json`, runs `gradle(task: "bundle", build_type: "Release")` with signing env vars injected via `properties:`, then calls `upload_to_play_store`.

**`Appfile`**:
```ruby
json_key_file(ENV['PLAY_STORE_JSON_KEY_PATH'])
package_name("run.pocketdev.mobile")
```

**`.env.example`**:
```
PLAY_STORE_JSON_KEY_PATH=~/pocketdev-play-key.json
ANDROID_KEYSTORE_PATH=~/pocketdev-release.keystore
ANDROID_KEYSTORE_PASSWORD=...
ANDROID_KEY_ALIAS=pocketdev
ANDROID_KEY_PASSWORD=...
```

Copy to `.env` (gitignored) and fill in real values.

### C. `apps/mobile/scripts/deploy-playstore.js` (new file)

Mirrors `scripts/deploy-testflight.js`:
- Accepts `internal` | `beta` | `release` argument
- Runs `BUNDLE_GEMFILE="../Gemfile" bundle exec fastlane {lane}` from `android/` directory
- Streams output + writes to `build-logs/deploy-android-{mode}/`
- Prunes old logs (keep 10)

### D. `apps/mobile/package.json`

```json
"deploy:android:beta": "node scripts/deploy-playstore.js beta",
"deploy:android:release": "node scripts/deploy-playstore.js release"
```

### E. Root `package.json`

```json
"deploy:android:beta": "pnpm --filter mobile run deploy:android:beta",
"deploy:android:release": "pnpm --filter mobile run deploy:android:release"
```

---

## Verification

1. Confirm build: `cd apps/mobile/android && ./gradlew bundleRelease` (with env vars set)
2. Confirm Play Console access: `bundle exec fastlane supply init` from `android/fastlane/`
3. First deploy: `pnpm deploy:android:beta` → uploads to internal testing track (visible in ~5-10 min)
