# UI expansion audit

Issue #5 asks which page family should get the BETRoblox treatment next. This is
an audit and a recommendation. **No page UI is implemented here**; per the
issue's acceptance, a follow-up page needs its own workflow brief, compatibility
plan, implementation, and browser QA before it counts as done.

## What is redesigned today

The shared shell (`js/main.js`, `css/ducky.css`) is applied to exactly three
pages, listed in `DUCKY_PAGE_LABELS`:

| Page | Route | Label |
| --- | --- | --- |
| `catalog` | `^/catalog/?$` | Marketplace |
| `itemdetails` | `^/(catalog\|library\|game-pass\|badges\|bundles)/(\d+)/` | Item details |
| `avatar` | `^/my/avatar` | Avatar studio |

Everything else still uses inherited BTRoblox presentation.

## Candidates

Hook style is the main risk signal. Angular template rewriting is the most
brittle — Roblox is migrating away from Angular, and a rewritten template breaks
silently when markup shifts. React hooks are moderate. Plain DOM watching is the
most durable.

| Page | Route | Existing behavior | Hook style | DOM risk | Workflow value |
| --- | --- | --- | --- | --- | --- |
| `home` | `^/home` | Friend list layout, favorites ordering, player counts, hover actions | React + DOM | Medium | **High** — first page most sessions see |
| `profile` | `^/users/(\d+)/profile` | Embedded inventory | React + XHR | Medium | Medium |
| `inventory` | `^/users/(\d+)/inventory` | Inventory tools | Angular + DOM | **High** | Medium |
| `gamedetails` | `^/games/(\d+)/` | Server pager, region display, badge stats | Angular + XHR | **High** | Medium |
| `groups` | `^/communities/(\d+)` | Layout modification | Angular | **High** | Low |
| `create*` | `create.roblox.com` | Asset options, version download | webpack internals | **Very high** | Low — creator tool, not a player workflow |
| `money` | `^/transactions` | Robux-to-cash conversion | DOM | Low | Low |
| `friends` | `^/users/(\d+)/friends` | Friend list tweaks | DOM | Low | Low |

## Recommendation: `home`

1. **Highest traffic.** It is the landing page for a logged-in session, so the
   shell's value per user is greatest there.
2. **Tolerable risk.** Its hooks are React and plain DOM watching, not Angular
   template rewriting.
3. **Shell already fits.** Home is a browse-and-navigate surface, the same shape
   as the catalog the shell was designed around.
4. **Independent features.** Friends layout, favorites ordering, and player
   counts are separable, so the work can land incrementally.

**Runner-up: `profile`.** Similar risk, lower traffic. Worth doing after home,
partly because it shares the embedded-inventory surface with `inventory`.

**Defer `inventory`, `gamedetails`, `groups`, `create*`.** All lean on Angular
template rewriting or webpack internals. Redesigning presentation on top of a
brittle compatibility layer means debugging two problems at once.

## Constraints for whoever does the next page

- Reuse the shell and the accessibility tokens in `css/ducky.css`. Do not force
  one layout onto a page whose task shape differs.
- Preserve every familiar Roblox action. If a legacy behavior is dropped,
  document it in `CHANGELOG.md` and say why.
- Keep compatibility logic separate from presentation, so upstream fixes stay
  portable.
- Add the page to `DUCKY_PAGE_LABELS` and give it a QA section in
  `docs/QA_PHASE_ONE.md`.
- Keyboard reachability, visible focus, contrast, and reduced motion are part of
  the definition of done.

## Inherited inconsistencies found while auditing

Real, out of scope for issues #1–#6, worth folding into the next UI change:

1. The shell brand still reads `BTR` / `WORKSPACE` (`js/main.js`, the
   `btr-ducky-brand-copy` markup) despite the BETRoblox rebrand.
2. The settings modal footer links to the upstream author's personal X and
   Roblox profiles.
3. That footer says "Refresh the page to apply settings", which is now only
   partly true — most hooks re-read settings per call.
4. Both manifests carry `version: "3.6.22"`, which is upstream's version.
