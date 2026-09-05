"use strict"

// Validates the extension without installing anything.
//
// Two independent check sets, deliberately kept apart because they answer
// different questions and resolve paths against different roots:
//
//   source    (default)          root = repository. Are the checked-in manifests
//                                and the asset registries that no manifest covers
//                                internally consistent? This is what CI runs.
//
//   generated (--generated=DIR)  root = the directory a browser will load. Is the
//                                manifest.json in there a faithful copy of its
//                                source, and does every path it names resolve
//                                *inside that directory*? Catches an incomplete
//                                copy, which the source checks cannot see.
//
// Usage:
//   node tools/validate-extension.js
//   node tools/validate-extension.js --generated=. --target=chrome

const fs = require("node:fs")
const path = require("node:path")
const crypto = require("node:crypto")

const REPO = path.resolve(__dirname, "..")

const arg = name => {
	const hit = process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`))
	if(!hit) { return null }
	return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true
}

const TARGETS = ["chrome", "firefox"]
const SIDECAR = ".manifest-build.json"

// Inherited upstream Roblox API-surface data: enum names only, no call sites.
const PURCHASE_EXEMPT = new Set(["js/rbx/ApiDump.js"])

// URL- and call-shaped only, so an enum entry such as "ContextualPurchase" or a
// label like "Show Buy Gift Cards" cannot trip this.
const PURCHASE_PATTERNS = [
	/https?:\/\/[^\s"'`]*\/(v\d+\/)?purchases?\b/i,
	/economy\.roblox\.com[^\s"'`]*purchase/i,
	/\/marketplace\/product[^\s"'`]*\/purchase/i,
	/creator-marketplace-purchasing-service/i,
	/\bpurchaseProduct\s*\(/i,
	/\bsubmitPurchase\s*\(/i
]

// loadfeature.js swaps this in only when IS_DEV_MODE is set, and dev/ is not
// part of this tree.
const OPTIONAL_FEATURE_ALLOWLIST = new Set(["dev/three.js"])

// updatePageCSS() appends ducky.css after the theme fan-out, so it is the one
// stylesheet that is never requested with a theme prefix.
const NO_THEME_VARIANT = new Set(["ducky.css"])

//

const problems = []
const fail = (check, detail) => problems.push(`${check}: ${detail}`)

const readJson = abs => {
	try {
		return { value: JSON.parse(fs.readFileSync(abs, "utf8")) }
	} catch(ex) {
		return { error: ex.message }
	}
}

const exists = (root, ref) => fs.existsSync(path.join(root, ref.replace(/^\//, "")))

const sha256 = abs => crypto.createHash("sha256").update(fs.readFileSync(abs)).digest("hex")

// Every js/css/icon path a manifest names, whichever manifest version it is.
const manifestRefs = manifest => {
	const refs = []

	if(manifest.background?.service_worker) { refs.push(manifest.background.service_worker) }
	refs.push(...(manifest.background?.scripts ?? []))

	for(const script of manifest.content_scripts ?? []) {
		refs.push(...(script.js ?? []), ...(script.css ?? []))
	}

	refs.push(...Object.values(manifest.icons ?? {}))

	return refs
}

// MV3 uses [{ resources }], MV2 a bare string array.
const warResources = manifest => (manifest.web_accessible_resources ?? []).flatMap(entry =>
	typeof entry === "string" ? [entry] : (entry.resources ?? [])
)

const globMatches = (root, pattern) => {
	const clean = pattern.replace(/^\//, "")

	if(!clean.includes("*")) { return fs.existsSync(path.join(root, clean)) }

	const dir = path.join(root, path.dirname(clean))
	if(!fs.existsSync(dir)) { return false }

	const suffix = path.basename(clean).replace(/^\*/, "")
	return fs.readdirSync(dir).some(name => name.endsWith(suffix))
}

// Pulls one `const NAME = {` ... matching `}` block out of a source file.
const literalBlock = (source, declaration) => {
	const start = source.indexOf(declaration)
	if(start === -1) { return null }

	let depth = 0

	for(let i = source.indexOf("{", start); i < source.length; i++) {
		if(source[i] === "{") { depth++ }
		else if(source[i] === "}" && --depth === 0) { return source.slice(start, i + 1) }
	}

	return null
}

const stringsIn = block => [...block.matchAll(/"([^"\n]+)"/g)].map(m => m[1])

//

const checkManifestShape = (label, manifest) => {
	const required = ["manifest_version", "name", "version", "description", "icons", "content_scripts", "background"]
	for(const key of required) {
		if(!(key in manifest)) { fail(label, `missing required key "${key}"`) }
	}

	if(manifest.manifest_version === 3) {
		if(!manifest.background?.service_worker) { fail(label, "MV3 requires background.service_worker") }
		if(!manifest.action) { fail(label, `MV3 requires "action"`) }
		if(!Array.isArray(manifest.host_permissions)) { fail(label, `MV3 requires "host_permissions"`) }
	} else if(manifest.manifest_version === 2) {
		if(!Array.isArray(manifest.background?.scripts)) { fail(label, "MV2 requires background.scripts") }
		if(!manifest.browser_action) { fail(label, `MV2 requires "browser_action"`) }
	} else {
		fail(label, `unsupported manifest_version ${manifest.manifest_version}`)
	}
}

const checkRefs = (label, root, manifest) => {
	for(const ref of manifestRefs(manifest)) {
		if(!exists(root, ref)) { fail(label, `references missing file "${ref}"`) }
	}

	for(const pattern of warResources(manifest)) {
		if(!globMatches(root, pattern)) { fail(label, `web_accessible_resources "${pattern}" matches no file`) }
	}
}

//

const validateSource = () => {
	const manifests = {}

	for(const target of TARGETS) {
		const rel = `manifest.${target}.json`
		const abs = path.join(REPO, rel)

		if(!fs.existsSync(abs)) { fail(rel, "not found"); continue }

		const { value, error } = readJson(abs)
		if(error) { fail(rel, `does not parse (${error})`); continue }

		manifests[target] = value
		checkManifestShape(rel, value)
		checkRefs(rel, REPO, value)
	}

	const versions = [...new Set(Object.values(manifests).map(m => m.version))]
	if(versions.length > 1) {
		fail("version parity", `manifests disagree: ${versions.join(" vs ")}`)
	}

	// The service worker pulls these in itself; no manifest lists them.
	const swPath = path.join(REPO, "js/serviceworker.js")
	if(fs.existsSync(swPath)) {
		for(const ref of stringsIn(fs.readFileSync(swPath, "utf8"))) {
			if(ref.startsWith("/js/") && !exists(REPO, ref)) {
				fail("js/serviceworker.js", `importScripts references missing file "${ref}"`)
			}
		}
	} else {
		fail("js/serviceworker.js", "not found")
	}

	// Second asset registry: injected via chrome.scripting.executeScript, so it
	// is invisible to every manifest check above.
	const featPath = path.join(REPO, "js/feat/loadfeature.js")
	const featBlock = fs.existsSync(featPath)
		? literalBlock(fs.readFileSync(featPath, "utf8"), "const optionalFeatures = {")
		: null

	if(!featBlock) {
		fail("js/feat/loadfeature.js", "could not read the optionalFeatures registry")
	} else {
		for(const ref of stringsIn(featBlock)) {
			if(!/\.(js|css)$/.test(ref)) { continue }
			if(OPTIONAL_FEATURE_ALLOWLIST.has(ref)) { continue }
			if(!exists(REPO, ref)) { fail("optionalFeatures", `references missing file "${ref}"`) }
		}
	}

	// Page assets are resolved at runtime from PAGE_INFO, not from any manifest.
	const mainPath = path.join(REPO, "js/main.js")
	const pageBlock = fs.existsSync(mainPath)
		? literalBlock(fs.readFileSync(mainPath, "utf8"), "const PAGE_INFO = {")
		: null

	const themedCss = new Set(["main.css", "settingsmodal.css", "create.css"])

	if(!pageBlock) {
		fail("js/main.js", "could not read the PAGE_INFO registry")
	} else {
		for(const [, list] of pageBlock.matchAll(/\bjs:\s*\[([^\]]*)\]/g)) {
			for(const ref of stringsIn(list)) {
				if(!exists(REPO, `js/${ref}`)) { fail("PAGE_INFO", `js references missing file "js/${ref}"`) }
			}
		}

		for(const [, list] of pageBlock.matchAll(/\bcss:\s*\[([^\]]*)\]/g)) {
			for(const ref of stringsIn(list)) {
				if(!exists(REPO, `css/${ref}`)) { fail("PAGE_INFO", `css references missing file "css/${ref}"`) }
				themedCss.add(ref)
			}
		}
	}

	// updatePageCSS() requests <theme>/<file> for everything in the fan-out, so a
	// missing variant is a 404 on every themed page load.
	const settingsPath = path.join(REPO, "js/feat/settings.js")
	const themeMatch = fs.existsSync(settingsPath)
		&& fs.readFileSync(settingsPath, "utf8").match(/theme:\s*\{[^}]*validValues:\s*\[([^\]]*)\]/)

	if(!themeMatch) {
		fail("js/feat/settings.js", "could not read general.theme validValues")
	} else {
		for(const theme of stringsIn(themeMatch[1])) {
			if(theme === "default") { continue }

			for(const file of themedCss) {
				if(NO_THEME_VARIANT.has(file)) { continue }
				if(!exists(REPO, `css/${theme}/${file}`)) {
					fail("theme variants", `missing "css/${theme}/${file}"`)
				}
			}
		}
	}

	// Purchasing is a standing non-goal (PROJECT_CONTEXT.md), so it is enforced
	// rather than promised.
	const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
		const abs = path.join(dir, entry.name)
		return entry.isDirectory() ? walk(abs) : [abs]
	})

	for(const abs of walk(path.join(REPO, "js"))) {
		if(!abs.endsWith(".js")) { continue }

		const rel = path.relative(REPO, abs).split(path.sep).join("/")
		if(PURCHASE_EXEMPT.has(rel)) { continue }

		fs.readFileSync(abs, "utf8").split("\n").forEach((line, index) => {
			if(PURCHASE_PATTERNS.some(re => re.test(line))) {
				fail("purchase guard", `${rel}:${index + 1} looks like a purchase call site`)
			}
		})
	}
}

const validateGenerated = (dir, target) => {
	const root = path.resolve(dir)
	const generated = path.join(root, "manifest.json")
	const source = path.join(root, `manifest.${target}.json`)

	if(!fs.existsSync(generated)) { fail("generated", `${generated} not found`); return }
	if(!fs.existsSync(source)) { fail("generated", `${source} not found (cannot verify provenance)`); return }

	if(sha256(generated) !== sha256(source)) {
		fail("generated", `manifest.json is not byte-identical to manifest.${target}.json`)
	}

	const { value: manifest, error } = readJson(generated)
	if(error) { fail("generated", `manifest.json does not parse (${error})`); return }

	const expected = target === "firefox" ? 2 : 3
	if(manifest.manifest_version !== expected) {
		fail("generated", `manifest_version ${manifest.manifest_version} does not match target "${target}" (expected ${expected})`)
	}

	// Resolved against the load directory, not the repository: this is what
	// catches a copy that dropped lib/ or res/.
	checkRefs("generated", root, manifest)

	const sidecarPath = path.join(root, SIDECAR)
	if(!fs.existsSync(sidecarPath)) {
		fail("generated", `${SIDECAR} not found; manifest.json has no recorded provenance`)
		return
	}

	const { value: sidecar, error: sidecarError } = readJson(sidecarPath)
	if(sidecarError) { fail("generated", `${SIDECAR} does not parse (${sidecarError})`); return }

	if(sidecar.target !== target) {
		fail("generated", `${SIDECAR} records target "${sidecar.target}", expected "${target}"`)
	}

	if(sidecar.sourceSha256 !== sha256(source)) {
		fail("generated", `${SIDECAR} hash is stale; rerun the build`)
	}
}

//

const generated = arg("generated")
const target = arg("target") || "chrome"

if(!TARGETS.includes(target)) {
	console.error(`Unknown --target "${target}". Expected one of: ${TARGETS.join(", ")}`)
	process.exit(2)
}

const mode = generated ? `generated (${path.resolve(generated === true ? "." : generated)}, target=${target})` : "source"

if(generated) {
	validateGenerated(generated === true ? "." : generated, target)
} else {
	validateSource()
}

if(problems.length) {
	console.error(`FAIL  ${mode} validation: ${problems.length} problem${problems.length === 1 ? "" : "s"}`)
	for(const problem of problems) { console.error(`  - ${problem}`) }
	process.exit(1)
}

console.log(`PASS  ${mode} validation`)
