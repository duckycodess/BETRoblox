# Firefox support: inventory and decision matrix

**Status: undecided. Firefox is not supported, and no support is claimed.**

`manifest.firefox.json` is inherited from BTRoblox and still in the tree. It has
not been tested against this codebase. This document inventories what differs
and gives a matrix to fill in; it deliberately does not reach a verdict, because
no Firefox run has happened. Issue #6 is complete when the matrix has been
executed and a decision written at the bottom.

## Manifest differences

| Concern | Chromium (`manifest.chrome.json`) | Firefox (`manifest.firefox.json`) |
| --- | --- | --- |
| Manifest version | 3 | 2 |
| Background | `background.service_worker` → `js/serviceworker.js` | `background.scripts` array, loaded directly |
| Toolbar entry | `action` | `browser_action` |
| Host access | `host_permissions` array | Hosts mixed into `permissions` |
| Web-accessible resources | Array of `{resources, matches}` objects | Bare string array |
| Network rules | `declarativeNetRequestWithHostAccess` | Not requested |
| Minimum version | `minimum_chrome_version: 111` | `strict_min_version: 128.0` |
| Extension identity | Assigned by the store | `browser_specific_settings.gecko.id` |

The service worker is the largest gap. `js/serviceworker.js` uses
`importScripts`, and MV2 background pages load the same files through
`background.scripts`. Both entry paths exist today, but only the Chromium one
is exercised.

## Code that already branches on Firefox

| Location | Behavior |
| --- | --- |
| `js/utility.js:4` | `IS_FIREFOX` derived from `browser_specific_settings.gecko` |
| `js/utility.js:3` | `IS_MANIFEST_V3` |
| `js/main.js:304,317,334` | `cloneInto` when passing data across the page-world boundary; Firefox enforces Xray vision, Chromium does not |
| `js/background.js:82` | Reads hosts from `host_permissions` or `permissions` depending on manifest version |
| `js/background.js:88` | `chrome.action` vs `chrome.browserAction` |
| `js/feat/settings.js` | `general.fixFirefoxLocalStorageIssue`, a Firefox-only workaround |

The `cloneInto` calls are the risk worth watching: the page-world bridge is how
every hook receives settings, and Xray wrappers are a Firefox-only failure mode
that cannot be reproduced in Chromium.

## Known problems, found by inspection

1. **Extension identity collides with upstream.**
   `browser_specific_settings.gecko.id` is `btroblox@antiboomz.com` — upstream
   BTRoblox's AMO identifier. Publishing under it would collide with, or
   impersonate, someone else's listing. **This must change before any Firefox
   distribution**, independent of whether support is adopted.
2. **Manifest key predates the declared minimum.**
   `data_collection_permissions` is a Firefox 140+ key, but
   `strict_min_version` is `128.0`. Unverified; likely an AMO validation error.
3. **Version string is upstream's.** Both manifests still say `3.6.22`, which is
   BTRoblox's version, not a BETRoblox one.

## Test matrix — to be executed

Every row is `not run`. Do not mark Firefox supported on partial results.

| # | Area | Check | Result |
| --- | --- | --- | --- |
| 1 | Load | Extension loads as a temporary add-on (`about:debugging`) | `not run` |
| 2 | Load | No manifest warnings or errors | `not run` |
| 3 | Background | MV2 background page starts; all scripts load | `not run` |
| 4 | Storage | Settings save and survive a restart | `not run` |
| 5 | Storage | `general.fixFirefoxLocalStorageIssue` still needed? | `not run` |
| 6 | Messaging | `btroblox/inject/*` reaches the page world through `cloneInto` | `not run` |
| 7 | Messaging | `btroblox/content/*` reaches the isolated world | `not run` |
| 8 | Page hooks | `Object.defineProperty` interception works under Xray | `not run` |
| 9 | Page hooks | Avatar accessory limits lift on `/my/avatar` | `not run` |
| 10 | Page hooks | React and Angular hooks attach | `not run` |
| 11 | Permissions | Host permissions granted without a prompt loop | `not run` |
| 12 | Network | Features needing `declarativeNetRequest` degrade cleanly | `not run` |
| 13 | Lazy features | `chrome.scripting.executeScript` equivalent works in MV2 | `not run` |
| 14 | UI | Settings modal, themes, and page CSS render | `not run` |
| 15 | Identity | A non-colliding extension ID is chosen | `not run` |

## Decision

**Not yet made.** Fill in the matrix, then record here: whether Firefox is
supported, which minimum version, whether `manifest.firefox.json` stays in the
tree or is removed, and what release constraints apply.

Until then:

- `README.md` states Chromium only.
- No Firefox support is claimed anywhere.
- `manifest.firefox.json` stays, unclaimed, so the option is not lost. The
  validator checks it for internal consistency, which is not the same as
  testing it in Firefox.
