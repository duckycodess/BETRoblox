# Phase-one manual QA checklist

Durable record of which phase-one workflows have been exercised against the live
Roblox site.

**Every row below is `not run`.** Nothing in this file has been verified against
a real Roblox account yet. Automated coverage
(`node --test "test/**/*.test.js"`) pins the page-world hook contract only; it
cannot tell you whether Roblox's live bundle still behaves the way the hooks
assume. Fill a row in only after actually performing it, and record what you
observed rather than what you expected.

## Environment

Record once per QA pass and repeat the table for each pass.

| Field | Value |
| --- | --- |
| Date | _not run_ |
| Extension version | `3.6.22` (`manifest.chrome.json`) |
| Extension commit | _not run_ |
| Browser and version | _not run_ |
| OS | _not run_ |
| Roblox page build / asset hash | _not run_ |
| Account state | _not run_ (logged out / logged in) |
| Theme | _not run_ |

## How to prepare

```sh
node tools/build-manifest.js
# chrome://extensions -> Developer mode -> Load unpacked -> repository root
```

Requires Chromium 111 or newer (`world: "MAIN"` content scripts). After changing
extension code, press reload on the BETRoblox card, then reload the Roblox tab.

For each row record: exact steps, expected result, **observed result**, pass or
fail, and any console output. Attach console errors verbatim.

---

## 1. Catalog browsing

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 1.1 | Open `/catalog` | Page renders, Roblox UI not blocked | | `not run` |
| 1.2 | Search for an item | Results update, no console errors | | `not run` |
| 1.3 | Apply category and subcategory filters | Filters apply, results reflect them | | `not run` |
| 1.4 | Change sort order | Order changes, no duplicate or missing results | | `not run` |
| 1.5 | Narrow the window to a tablet and phone width | Layout stays usable, nothing clipped | | `not run` |
| 1.6 | Scroll to trigger paging | Further results load | | `not run` |

## 2. Item details and non-purchasing actions

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 2.1 | Open an item detail page | Renders with thumbnail and metadata | | `not run` |
| 2.2 | Open the item previewer | 3D preview loads | | `not run` |
| 2.3 | Hover-preview a catalog item | Preview appears per the hover setting | | `not run` |
| 2.4 | Favorite, then unfavorite an owned item | State toggles and persists on reload | | `not run` |
| 2.5 | Wear an owned item | Item is worn; avatar updates | | `not run` |
| 2.6 | **Confirm no purchase is ever initiated** | No purchase dialog, no purchase request in DevTools Network | | `not run` |

## 3. Avatar editing, clothing layers, double clothing

Requires an authenticated session. `/my/avatar` redirects to login otherwise.

To reach the toggles: settings modal → **Avatar** group. Both
*Remove Accessory Limits* and *Remove Layered Clothing Limits* default to on.

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 3.1 | Open `/my/avatar` while logged in | Editor renders, no console errors | | `not run` |
| 3.2 | Add accessories past Roblox's native limit | Extra accessories stay on the avatar | | `not run` |
| 3.3 | Add several layered clothing items in one category | All are kept, not silently dropped | | `not run` |
| 3.4 | Double clothing: wear two shirts / two pants | Both are worn and render | | `not run` |
| 3.5 | Remove items one at a time | Each removal takes effect; no orphans | | `not run` |
| 3.6 | Verify category restoration | Items Roblox dropped by category cap are put back | | `not run` |
| 3.7 | Save the avatar | Save succeeds; state survives a reload | | `not run` |
| 3.8 | Inspect outfits | Outfit list and contents are correct | | `not run` |
| 3.9 | Switch R6 / R15 | No error; worn items behave sanely | | `not run` |

### 3A. `KEEP_LIMIT` = 100 (new divergence — needs deliberate testing)

`KEEP_LIMIT` is 100 in BETRoblox; upstream ReBTRoblox uses 10. This has **never
been validated against the live avatar editor**. See `docs/ARCHITECTURE.md`.

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 3A.1 | Wear 20+ accessories | Editor stays responsive | | `not run` |
| 3A.2 | Wear 50+ accessories | Editor usable; note any lag in seconds | | `not run` |
| 3A.3 | Render the avatar composite at high counts | Composite renders; no missing textures | | `not run` |
| 3A.4 | Save an avatar with a very high item count | Save succeeds or fails cleanly with a visible message | | `not run` |
| 3A.5 | Reload after saving a high count | Roblox returns the same avatar | | `not run` |
| 3A.6 | Judgement: is 100 workable? | Record a recommendation to keep or lower `KEEP_LIMIT` | | `not run` |

### 3B. Live toggling without reload

Counterpart to the Fix A and Fix B hook changes.

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 3B.1 | With the editor open, turn *Remove Accessory Limits* **off** | Limits return immediately, no reload | | `not run` |
| 3B.2 | Turn it back **on** | Limits lift again immediately | | `not run` |
| 3B.3 | Toggle *Remove Layered Clothing Limits* off and on | Layered limit follows immediately | | `not run` |
| 3B.4 | After disabling, add items past the native cap | Roblox's own caps apply again | | `not run` |
| 3B.5 | Load a page with the setting already off, then turn it on | Known limit: takes effect only after reload | | `not run` |

## 4. Settings, themes, accessibility

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 4.1 | Open the settings modal | Opens; all groups render | | `not run` |
| 4.2 | Avatar group is present and functional | Four checkboxes; layered requires accessory limits | | `not run` |
| 4.3 | Change a setting, reload | Setting persists | | `not run` |
| 4.4 | Reset settings to default | All settings return to defaults | | `not run` |
| 4.5 | Switch each theme: default, simblk, sky, red | Theme applies; no unstyled flash; no 404 in Network | | `not run` |
| 4.6 | Tab through the modal | Focus order is sensible, focus ring visible | | `not run` |
| 4.7 | Activate the settings toggle by keyboard | Opens without a mouse | | `not run` |
| 4.8 | Enable OS "reduce motion" | No unnecessary animation | | `not run` |

## 5. Logged-out fallback

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 5.1 | Browse `/catalog` logged out | Works; no unhandled errors | | `not run` |
| 5.2 | Open an item detail page logged out | Renders | | `not run` |
| 5.3 | Visit `/my/avatar` logged out | Redirects to login without extension errors | | `not run` |
| 5.4 | Open the settings modal logged out | Opens and persists locally | | `not run` |

## 6. Installation and reload

| # | Workflow | Expected | Observed | Status |
| --- | --- | --- | --- | --- |
| 6.1 | `node tools/build-manifest.js` on a clean checkout | Writes `manifest.json`, prints load instructions | | `not run` |
| 6.2 | Load unpacked | Loads with no manifest warnings | | `not run` |
| 6.3 | Re-run the build | Reports "already up to date", writes nothing | | `not run` |
| 6.4 | Edit code, reload the extension, reload the tab | Change takes effect | | `not run` |
| 6.5 | Check `chrome://extensions` for errors | No errors on the BETRoblox card | | `not run` |

---

## Known limitations to confirm during QA

1. **Hook installation is decided at `document_start`.** A page loaded with a
   bypass setting off will not install the hook; enabling it live does nothing
   until reload (row 3B.5). Pinned by an automated test.
2. **Automated tests cannot see Roblox.** If Roblox stops publishing the avatar
   rules through `Object.defineProperty` getters, the hooks silently no-op and
   the test suite still passes. Rows 3.2–3.6 are the only real check.
3. **`KEEP_LIMIT` = 100 is unvalidated.** Section 3A exists to settle it.
4. **Copied values are out of reach.** If Roblox copies `maxNumber` out of a
   rule entry into a separate value, restoring the entry on disable cannot reach
   that copy. Watch for stale limits after toggling.
