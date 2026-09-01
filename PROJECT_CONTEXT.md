# Project Context: BETRoblox

## Summary
Create BETRoblox, a Chromium browser extension for Roblox based on the BTRoblox codebase, porting repaired behavior and fix logic from ReBTRoblox, and replacing the inherited UI with a clearer, cleaner design. ReBTRoblox is a fix reference, not the project lineage.

## Problem
The BTRoblox lineage is discontinued and some functionality, notably double clothing, stopped working. ReBTRoblox repairs the functionality but retains the general inherited UI. BETRoblox needs a more understandable interface without losing familiar Roblox workflows.

## Users or stakeholders
- Roblox players using the desktop site in Chromium browsers.
- Project maintainer and local testers.
- BTRoblox and ReBTRoblox authors, whose work requires attribution and appropriate reuse handling.

## Goals
- Establish a working phase-one baseline from BTRoblox with relevant ReBTRoblox fixes ported in.
- Redesign selected Roblox pages with a clean, Roblox-native visual language.
- Preserve familiar actions and underlying Roblox data behavior.
- Make clothing and avatar workflows, including double clothing, reliable and understandable.
- Deliver a locally loadable developer build before considering public distribution.

## Non-goals
- Firefox support in the initial scope.
- Full BTRoblox/ReBTRoblox feature parity in phase one.
- Purchase automation or initiating purchases from the extension.
- Third-party analytics, telemetry, or data collection.
- Public store release during the initial milestone.

## Scope
Phase one covers catalog browsing, search/filtering, item details, previews, avatar editing, clothing, and outfit inspection. The UI will be redesigned page-by-page, beginning with these surfaces and expanding only after the initial workflows are stable. Relevant existing functionality on those pages is retained; obsolete functionality may be removed after audit.

## Core workflows
1. Browse, search, and filter catalog items.
2. Open item details and preview an item.
3. Wear, equip, or favorite items through Roblox-controlled actions.
4. Edit and inspect an avatar, including multiple clothing layers/double clothing.
5. Inspect outfits and related clothing combinations.
6. Change local extension settings, theme, and feature toggles; reset defaults.
7. Build and load the extension locally in a Chromium browser.

## Functional requirements
- Target Chrome-compatible Manifest V3.
- Use BTRoblox as the fork/base; port relevant working fixes from ReBTRoblox, including repaired double-clothing behavior, without carrying over ReBTRoblox's UI.
- Fully recompose selected page layouts while preserving supported Roblox actions and data.
- Provide a shared compact UI shell with contextual navigation across redesigned pages.
- Permit non-purchasing actions such as wear, equip, and favorite; never initiate purchases.
- Store feature toggles, light/dark preference, and resettable settings locally.
- Make no third-party data requests beyond Roblox services required by the supported functionality.
- Keep future upstream fix porting practical by separating compatibility logic from the UI layer.

## Non-functional requirements
- Keyboard-accessible controls, readable contrast, and reduced-motion support.
- Resilience to Roblox DOM and API changes where practical.
- Minimal permissions and maintainable separation between page hooks, Roblox integration, and presentation.
- No avoidable performance regression on supported Roblox pages.

## Acceptance criteria
- A production-style local build installs/loads successfully as a Chromium developer extension.
- Phase-one catalog and avatar/clothing workflows work on supported Roblox pages without blocking page functionality.
- Item browsing, details, preview, wear/equip, and favorite actions behave as intended.
- Double clothing/multiple clothing behavior matches the repaired ReBTRoblox behavior.
- Settings persist locally, theme switching works, and reset restores defaults.
- Primary redesigned controls are usable with keyboard navigation and readable contrast.
- Manual smoke tests cover each phase-one workflow before expanding scope.

## Confirmed decisions
- This is a new project in the currently empty workspace.
- Chromium-only initial target.
- Functional local developer-loaded extension is the first delivery.
- Phase-one scope is catalog, item details, avatar, and clothing.
- Redesign is incremental, clean, Roblox-native, and workflow-preserving.
- Use a shared shell/contextual navigation model.
- Include local settings, light/dark mode, reset, and accessibility support.
- Store preferences locally and avoid third-party data collection.
- Allow wear/equip/favorite actions but not purchases.
- Periodically port relevant upstream fixes.
- Initial validation is manual smoke testing.
- The product name is BETRoblox; its GitHub source repository is maintained separately from the upstream repositories.
- The project is non-commercial/personal in intent.

## Proposed decisions
- Keep BTRoblox's lineage and feature structure as the base; port only relevant ReBTRoblox behavior and fixes, then replace the UI layer.
- Use ReBTRoblox as the behavioral reference for double clothing until a more precise product specification is needed.
- Keep later page families and public distribution out of phase one.

## Constraints and assumptions
- The local workspace had no existing source files or Git metadata when scoped.
- The extension targets desktop Chromium Roblox web pages and relies on the user's existing Roblox session for account actions.
- Preserve upstream attribution when reusing the BTRoblox and ReBTRoblox code lineage.
- Roblox APIs, DOM structure, page behavior, and extension policies may change independently of this project.

## Data and integrations
- Roblox web pages and Roblox services used by the inherited functionality.
- Browser local storage for preferences only.
- No planned external service, account, or analytics integration.

## Security or privacy concerns
- Request only permissions needed for supported Roblox pages and local settings.
- Never collect, transmit, or expose credentials, session tokens, or unrelated browsing data.
- Keep purchase actions outside the extension.
- Review upstream code and dependencies before reuse or packaging.

## Testing expectations
- Manual smoke tests for catalog, item details, preview, wear/equip, favorite, avatar editing, double clothing, settings, theme, reset, and local installation.
- Test representative logged-in workflows and non-blocking catalog browsing.
- Add automated regression coverage for fragile page hooks and clothing behavior when implementation patterns are established.

## Risks
- Roblox DOM/API changes can break page hooks or actions.
- Reworking presentation while preserving inherited behavior may expose hidden coupling.
- Double clothing and avatar behavior may depend on undocumented Roblox APIs.
- Broad inherited functionality can make phase-one scope expand unexpectedly.
- Upstream code reuse and public redistribution may be restricted without compatible licensing or permission.

## Open questions
- Later-phase visual branding beyond the BETRoblox identity.
- Exact later-phase feature list.
- Public release and distribution plan after the local milestone.

## Documentation expected to change
- `PROJECT_CONTEXT.md` (this scope artifact).
- A README covering local installation, supported pages, and limitations.
- Preserve upstream attribution in public distributions.
- A phase-one manual test checklist and changelog.

## Suggested branch name
`feat/roblox-ui-redesign`
