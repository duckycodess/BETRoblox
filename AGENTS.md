# AGENTS.md

BETRoblox is a Chromium Manifest V3 browser extension for the Roblox website.
There is no server, no database, and no deployment target: everything here runs
in a browser. Ignore any instinct to look for one.

## Verified commands

Run from the repository root. Node 20 or newer; **no dependencies to install**.

| Command | What it does |
| --- | --- |
| `node tools/validate-extension.js` | Validates the checked-in manifests and the asset registries no manifest covers |
| `node tools/build-manifest.js` | Validates, then writes the gitignored `manifest.json` Chromium loads |
| `node tools/build-manifest.js --target=firefox` | Same, for the MV2 manifest |
| `node tools/build-manifest.js --check` | Validation only, writes nothing |
| `node --test "test/**/*.test.js"` | Page-world hook regression tests |
| `node tools/smoke-chromium.js` | Loads the extension in a headless Chromium (local only, not CI) |

`npm run build` / `validate` / `test` / `smoke` wrap the same commands.

## Authority order

When sources disagree, trust them in this order:

1. Source code, manifests, and tests
2. `docs/ARCHITECTURE.md`
3. `docs/CURRENT_STATE.md` if present, else `docs/QA_PHASE_ONE.md` for what is actually verified
4. `PRODUCT.md`
5. `PROJECT_CONTEXT.md` for founding intent

Report contradictions rather than picking whichever reads better.

## Constraints

- **Never initiate a purchase.** No purchase endpoint, no purchase UI, no code
  path that could become one. `tools/validate-extension.js` fails the build on
  purchase-shaped call sites; do not weaken that check to make something pass.
- **Never handle credentials.** No cookie reads, no token storage, no auth UI.
  Roblox requests rely on the browser's own session (`credentials: "include"`).
- **No telemetry, analytics, or third-party requests.** See `PRIVACY.md`.
- **No new extension permissions** without an explicit decision recorded in the
  manifest diff and the changelog.
- **No dependencies**, runtime or dev. The tooling is deliberately plain Node,
  and CI asserts that `package.json` declares none.
- **Keep legacy `btr*` contracts.** Event names (`btroblox/inject/*`,
  `btroblox/content/*`), storage keys (`BTRoblox:pageSettings`), CSS class
  prefixes, and page-world globals stay as they are; renaming them breaks stored
  preferences and inherited behavior. See `ATTRIBUTION.md`.
- **Chromium only.** Firefox is not supported; see `docs/FIREFOX_SUPPORT.md`.
  Do not add a support claim before that decision is written.

## Documentation routing

| Question | Document |
| --- | --- |
| How is this put together? | `docs/ARCHITECTURE.md` |
| What has actually been tested? | `docs/QA_PHASE_ONE.md` |
| What changed? | `CHANGELOG.md` |
| Which page should be redesigned next? | `docs/UI_EXPANSION_AUDIT.md` |
| Does Firefox work? | `docs/FIREFOX_SUPPORT.md` |
| Why does this project exist? | `PROJECT_CONTEXT.md`, `PRODUCT.md` |
| Where did the code come from? | `ATTRIBUTION.md` |

`docs/INDEX.md` routes the rest.

## Validation expectations

Before proposing a change as finished:

1. `node tools/validate-extension.js`
2. `node --test "test/**/*.test.js"`
3. `node tools/build-manifest.js`
4. `node tools/smoke-chromium.js` when extension loading could be affected
5. `git status --porcelain` — generated files must stay untracked

Never report a check as passing unless it was run. Automated coverage stops at
the page-world contract: it cannot prove Roblox's live bundle still exposes the
hooked keys. Anything account-dependent belongs in `docs/QA_PHASE_ONE.md` and
must be exercised by a human on a real Roblox account.
