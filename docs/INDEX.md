# Documentation index

BETRoblox is a Chromium Manifest V3 browser extension for the Roblox website.
No server, no database, no deployment target.

## By task

| I want to… | Read |
| --- | --- |
| Build and load the extension | [`../README.md`](../README.md) |
| Understand how the pieces fit | [`ARCHITECTURE.md`](ARCHITECTURE.md) |
| Know what has actually been tested | [`QA_PHASE_ONE.md`](QA_PHASE_ONE.md) |
| See what changed | [`../CHANGELOG.md`](../CHANGELOG.md) |
| Pick the next page to redesign | [`UI_EXPANSION_AUDIT.md`](UI_EXPANSION_AUDIT.md) |
| Find out whether Firefox works | [`FIREFOX_SUPPORT.md`](FIREFOX_SUPPORT.md) |
| Work on this repo as an agent | [`../AGENTS.md`](../AGENTS.md) |

## By subsystem

| Subsystem | Entry point | Notes |
| --- | --- | --- |
| Page-world hooks | `js/inject.js` | Runs in Roblox's realm; no `chrome.*`. See ARCHITECTURE. |
| Content scripts | `js/main.js`, `js/feat/*`, `js/pages/*` | Owns settings, routing, page CSS |
| Service worker | `js/serviceworker.js`, `js/background.js` | Storage, network rules, lazy injection |
| Build and validation | `tools/` | Zero dependencies |
| Tests | `test/` | `node --test "test/**/*.test.js"` |

## By authority

When sources disagree, prefer them in this order:

1. Source code, manifests, and tests
2. [`ARCHITECTURE.md`](ARCHITECTURE.md)
3. [`QA_PHASE_ONE.md`](QA_PHASE_ONE.md) for what is actually verified
4. [`../PRODUCT.md`](../PRODUCT.md)
5. [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md) for founding intent

Report contradictions rather than silently choosing one.

## Provenance and policy

- [`../ATTRIBUTION.md`](../ATTRIBUTION.md) — BTRoblox lineage, ReBTRoblox fix reference
- [`../PRIVACY.md`](../PRIVACY.md) — no data collection

## Architecture decisions

No ADRs yet. Add `decisions/` when a choice establishes a long-lived rule,
changes a contract, or is hard to reverse. The `KEEP_LIMIT` divergence from
upstream is recorded in [`ARCHITECTURE.md`](ARCHITECTURE.md) and does not
warrant one.
