# Changelog

Notable changes to BETRoblox. Based on [Keep a Changelog](https://keepachangelog.com/1.1.0/).

This project is a fork of [BTRoblox](https://github.com/AntiBoomz/BTRoblox) and
uses [ReBTRoblox](https://github.com/nrmu9/ReBTRoblox) as a behavioral fix
reference; see [ATTRIBUTION.md](ATTRIBUTION.md). Version numbers still track
upstream's `3.6.22`.

The current unreleased work tracks [issues #1–#6](https://github.com/duckycodess/BETRoblox/issues),
with authenticated QA, follow-up page implementation, and the Firefox decision
still open as documented below.

## [Unreleased]

### Added

- Avatar group in the settings modal, exposing *Remove Accessory Limits*,
  *Remove Layered Clothing Limits*, *Full Range Body Colors*, and *Refine Asset
  Layout*. These settings existed with defaults but were unreachable from the
  UI, which is inherited from BTRoblox. Without them the accessory-limit
  behavior cannot be exercised or disabled by a user.
- `tools/build-manifest.js` — validates, then writes the gitignored
  `manifest.json` Chromium loads. Idempotent, writes atomically, and refuses to
  overwrite a `manifest.json` it did not generate without `--force`. Provenance
  is recorded in a gitignored `.manifest-build.json`.
- `tools/validate-extension.js` — zero-dependency validation, split into source
  checks (repository root, run in CI) and generated checks
  (`--generated=DIR`, resolved against the directory a browser loads). Covers
  both manifests, the `importScripts` list in `js/serviceworker.js`, the
  `optionalFeatures` registry in `js/feat/loadfeature.js`, `PAGE_INFO` and its
  theme variants, `web_accessible_resources` globs, version parity, and a
  purchase-call-site guard.
- `tools/smoke-chromium.js` — loads the built extension in a headless Chromium
  and checks the service worker starts. Resolves the browser from `--chrome`,
  `CHROME_PATH`, or the Playwright and Puppeteer caches, and fails with the list
  of paths it searched. Stages into a temporary directory and removes the
  profile and staged copy on every exit path. Local only, not CI.
- `test/` — 25 regression tests for the avatar limit hooks, run with
  `node --test "test/**/*.test.js"`. No dependencies and no Roblox login. Each
  test loads `js/inject.js` in its own `node:vm` realm, because the hook
  replaces `Object.defineProperty` for the life of a realm.
- `.github/workflows/ci.yml` — validation, both generated manifests, and the
  test suite. Also asserts that no dependencies have been added.
- `package.json` with `build`, `validate`, `test`, and `smoke` scripts and **no
  dependencies**.
- Documentation: `AGENTS.md`, `CLAUDE.md`, `docs/INDEX.md`,
  `docs/ARCHITECTURE.md`, `docs/QA_PHASE_ONE.md`, `docs/UI_EXPANSION_AUDIT.md`,
  `docs/FIREFOX_SUPPORT.md`, and this changelog.

### Fixed

- `maxNumberOfLayeredClothingItems` now follows a live settings toggle. The
  descriptor hook latched its replacement on first read; because this key's
  replacement is a plain number rather than a function, the raised limit stayed
  in effect for the life of the page even after the setting was turned off. The
  hook now caches the original value and recomputes this key on every read,
  while the other three keep stable function identity.
- Disabling the Avatar group or either avatar limit setting now restores
  `maxNumber` on the affected asset-type entries the hook raised. Roblox hands
  back cached rule entries and compares them by identity, so the raise happens
  in place;
  previously nothing recorded the original value and the raise was permanent
  for the life of the page. The pre-raise value is now recorded and restored
  eagerly when initial or live settings change, so entries the page never looks
  up again are also put back. Object identity is preserved throughout.

### Changed

- `addAssetToAvatar` retention is now a named `KEEP_LIMIT`, raised from 10 to
  100 to match the contract in issue #2. **Upstream ReBTRoblox keeps 10.** This
  divergence has not been validated against the live avatar editor; editor
  responsiveness, composite rendering, and save behavior at high item counts are
  tracked in [`docs/QA_PHASE_ONE.md`](docs/QA_PHASE_ONE.md) section 3A.

### Known limitations

- Hook installation is decided once at `document_start`, so a page loaded with
  the Avatar group or accessory bypass turned off will not install the hook;
  enabling it live takes effect only after a reload. Inherited behavior, now
  pinned by tests.
- The test suite cannot prove Roblox's live bundle still publishes the avatar
  rules through `Object.defineProperty` getters. If that changes, the hooks
  silently do nothing and the tests still pass.
- Firefox is not supported and no support is claimed. See
  [`docs/FIREFOX_SUPPORT.md`](docs/FIREFOX_SUPPORT.md).
- No authenticated QA has been performed. Every row in
  [`docs/QA_PHASE_ONE.md`](docs/QA_PHASE_ONE.md) is `not run`.

## Earlier

Commits before this changelog, newest first:

- [`2a508ac`](https://github.com/duckycodess/BETRoblox/commit/2a508ac) docs: update reuse attribution
- [`330bfdd`](https://github.com/duckycodess/BETRoblox/commit/330bfdd) chore: rebrand extension as BETRoblox
- [`5c23033`](https://github.com/duckycodess/BETRoblox/commit/5c23033) feat: add BETRoblox workspace UI
- [`dbb05fb`](https://github.com/duckycodess/BETRoblox/commit/dbb05fb) fix: harden avatar and page hooks
- [`0b63dbb`](https://github.com/duckycodess/BETRoblox/commit/0b63dbb) docs: define reimagined extension scope

Anything before that is inherited BTRoblox history.
