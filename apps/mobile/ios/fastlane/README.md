fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios build

```sh
[bundle exec] fastlane ios build
```

Build and archive the app for development

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Build and upload to TestFlight

### ios release

```sh
[bundle exec] fastlane ios release
```

Build and upload to App Store

### ios test

```sh
[bundle exec] fastlane ios test
```

Run tests

### ios screenshots

```sh
[bundle exec] fastlane ios screenshots
```

Take screenshots for App Store

### ios bump_build

```sh
[bundle exec] fastlane ios bump_build
```

Increment build number

### ios bump_version_patch

```sh
[bundle exec] fastlane ios bump_version_patch
```

Increment version number (patch)

### ios bump_version_minor

```sh
[bundle exec] fastlane ios bump_version_minor
```

Increment version number (minor)

### ios bump_version_major

```sh
[bundle exec] fastlane ios bump_version_major
```

Increment version number (major)

### ios upload_rock_testflight

```sh
[bundle exec] fastlane ios upload_rock_testflight
```

Upload pre-built IPA from Rock to TestFlight

### ios upload_rock_app_store

```sh
[bundle exec] fastlane ios upload_rock_app_store
```

Upload pre-built IPA from Rock to App Store Connect

### ios rock_beta

```sh
[bundle exec] fastlane ios rock_beta
```

Build with Rock and upload to TestFlight (end-to-end)

### ios rock_release

```sh
[bundle exec] fastlane ios rock_release
```

Build with Rock and upload to App Store Connect (end-to-end)

### ios clean

```sh
[bundle exec] fastlane ios clean
```

Clean build artifacts

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
