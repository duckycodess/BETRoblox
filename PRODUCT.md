# Product

<!-- impeccable:product-schema 1 -->

> **Record note:** This product record is inferred from the finalized `PROJECT_CONTEXT.md` because no structured question tool was available. User-approved scope decisions are treated as confirmed; optional details remain open.
>
> **Product name:** BETRoblox.

## Platform

web

## Stack

Existing JavaScript Chromium Manifest V3 browser-extension codebase, based on the BTRoblox repository. The current upstream BTRoblox tree is a static extension layout without a package/build manifest; retain its working loading model unless implementation requires a small build improvement.

## Users

Roblox players using the desktop Roblox website in Chromium browsers, especially players browsing catalog items and editing or previewing avatar clothing.

## Product Purpose

Enhance Roblox's web experience while retaining familiar Roblox workflows. The first milestone must make catalog and avatar/clothing tasks reliable and easier to understand, including the repaired double-clothing behavior, and must be loadable locally as a developer extension.

## Positioning

BETRoblox is a BTRoblox fork that keeps the original feature lineage, ports verified maintenance fixes from ReBTRoblox, and separates those behaviors from a substantially clearer UI.

## Operating Context

Users interact with the extension on Roblox catalog, item-detail, and avatar pages, generally through an existing Roblox session. The maintainer builds the extension locally, loads it through Chromium's developer-extension screen, and validates workflows against the live Roblox website.

## Capabilities and Constraints

- Phase one covers catalog browsing/search/filtering, item details, previews, avatar editing, clothing, and outfit inspection.
- Supported non-purchasing actions include wear, equip, and favorite; the extension must not initiate purchases.
- Double clothing and relevant ReBTRoblox fixes are behavior requirements, not a reason to adopt ReBTRoblox's UI.
- The page layouts and presentation are redesigned incrementally with a shared compact shell and contextual navigation.
- Preferences are local, including feature toggles, light/dark preference, and reset.
- The initial target is desktop Chromium; Firefox and later page families are out of phase one.
- Public distribution is not part of the initial milestone.
- Later-phase feature list remains undecided; the product name is BETRoblox.

## Brand Commitments

- Use BETRoblox as the product identity while preserving appropriate BTRoblox and ReBTRoblox attribution.
- Use a clean, Roblox-native visual language with familiar task flows.
- Do not carry over ReBTRoblox's UI as the new product identity.

## Evidence on Hand

- Original source: `https://github.com/AntiBoomz/BTRoblox`
- Maintenance/fix reference: `https://github.com/nrmu9/ReBTRoblox`
- Local source tree and upstream references are available for comparison.
- No user research or custom visual assets have been provided; future work must not fabricate claims or testimonials.

## Product Principles

- Preserve the user's task and Roblox's underlying action model while improving comprehension.
- Port fixes deliberately; do not import unrelated presentation or feature scope.
- Make important state and recovery visible rather than relying on hidden controls.
- Keep preferences local and avoid unnecessary data collection.
- Treat accessibility and resilience to Roblox changes as product quality.

## Accessibility & Inclusion

Primary controls must support keyboard use, readable contrast, and reduced-motion preferences. The interface should remain understandable without relying on color alone.
