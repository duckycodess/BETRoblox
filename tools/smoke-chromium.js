"use strict"

// Loads the built extension into a headless Chromium and checks that it starts.
//
// Deliberately dependency-free: it talks to the browser over the DevTools HTTP
// endpoint rather than pulling in a driver. No browser path is hard-coded; pass
// one or let it look. Nothing is written into the repository, and the temporary
// profile and staged extension are removed on every exit path.
//
// Not part of CI: the browser location and the NSS shim below are specific to a
// developer machine, and CI runners ship their own Chrome.
//
// Usage:
//   node tools/smoke-chromium.js
//   node tools/smoke-chromium.js --chrome=/path/to/chrome
//   CHROME_PATH=/path/to/chrome node tools/smoke-chromium.js
//   node tools/smoke-chromium.js --extension=/already/prepared/dir

const fs = require("node:fs")
const os = require("node:os")
const path = require("node:path")
const { spawn, execFileSync } = require("node:child_process")

const REPO = path.resolve(__dirname, "..")

const arg = name => {
	const hit = process.argv.find(a => a === `--${name}` || a.startsWith(`--${name}=`))
	if(!hit) { return null }
	return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true
}

const target = arg("target") || "chrome"
const timeoutMs = Number(arg("timeout") || 30000)

if(target !== "chrome") {
	console.error(`Chromium smoke testing only supports --target=chrome (received "${target}").`)
	process.exit(2)
}

//
// Browser resolution. First existing candidate wins.
//

const cacheGlob = (dir, build) => {
	if(!fs.existsSync(dir)) { return [] }

	return fs.readdirSync(dir)
		.sort()
		.reverse()
		.map(name => build(name))
		.filter(Boolean)
}

const chromeCandidates = () => [
	typeof arg("chrome") === "string" ? arg("chrome") : null,
	process.env.CHROME_PATH,

	// Playwright's browser cache.
	...cacheGlob(path.join(os.homedir(), ".cache/ms-playwright"), name =>
		name.startsWith("chromium-") ? path.join(os.homedir(), ".cache/ms-playwright", name, "chrome-linux64/chrome") : null),

	// Puppeteer's browser cache.
	...cacheGlob(path.join(os.homedir(), ".cache/puppeteer/chrome"), name =>
		path.join(os.homedir(), ".cache/puppeteer/chrome", name, "chrome-linux64/chrome")),

	"/usr/bin/google-chrome",
	"/usr/bin/google-chrome-stable",
	"/usr/bin/chromium",
	"/usr/bin/chromium-browser",
	"/snap/bin/chromium"
].filter(Boolean)

// Some prebuilt Chromium bundles ship without NSS. If a user-local copy exists,
// point the child process at it rather than asking anyone to install libraries.
const nssCandidates = () => [
	process.env.BTR_NSS_DIR,
	path.join(os.homedir(), ".local/lib/btr-chromium/usr/lib/x86_64-linux-gnu"),
	path.join(os.homedir(), ".local/nss/root/usr/lib/x86_64-linux-gnu")
].filter(Boolean)

const candidates = chromeCandidates()
const chromePath = candidates.find(candidate => fs.existsSync(candidate))

if(!chromePath) {
	console.error([
		"Chromium not found.",
		"",
		"Pass one explicitly:",
		"  node tools/smoke-chromium.js --chrome=/path/to/chrome",
		"  CHROME_PATH=/path/to/chrome node tools/smoke-chromium.js",
		"",
		"Looked in:",
		...candidates.map(candidate => `  ${candidate}`)
	].join("\n"))
	process.exit(2)
}

const nssDir = nssCandidates().find(dir => fs.existsSync(path.join(dir, "libnspr4.so"))) || null

//
// Temporary state. Everything below is cleaned up by cleanup().
//

let extensionDir = typeof arg("extension") === "string" ? path.resolve(arg("extension")) : null
const stagedExtension = !extensionDir
let profileDir = null
let child = null
let cleaned = false

const cleanup = () => {
	if(cleaned) { return }
	cleaned = true

	if(child && child.exitCode === null && child.signalCode === null) {
		try { child.kill("SIGKILL") } catch {}
	}

	for(const dir of [stagedExtension ? extensionDir : null, profileDir]) {
		if(dir) {
			try { fs.rmSync(dir, { recursive: true, force: true }) } catch {}
		}
	}
}

process.on("exit", cleanup)
process.on("uncaughtException", ex => { console.error(ex); cleanup(); process.exit(1) })
for(const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
	process.on(signal, () => { cleanup(); process.exit(130) })
}

//
// Stage the extension. The repository itself is never modified.
//

if(extensionDir) {
	if(!fs.existsSync(path.join(extensionDir, "manifest.json"))) {
		console.error(`--extension=${extensionDir} has no manifest.json`)
		process.exit(2)
	}
} else {
	extensionDir = fs.mkdtempSync(path.join(os.tmpdir(), "betroblox-ext-"))

	const skip = /(^|[\\/])(\.git|node_modules|artifacts|manifest\.json|\.manifest-build\.json)([\\/]|$)/
	fs.cpSync(REPO, extensionDir, { recursive: true, filter: src => !skip.test(src) })

	try {
		execFileSync(process.execPath, [
			path.join(__dirname, "build-manifest.js"),
			`--target=${target}`,
			`--out=${extensionDir}`
		], { stdio: "pipe" })
	} catch(ex) {
		console.error("Failed to prepare the extension:")
		console.error(ex.stdout?.toString() || "", ex.stderr?.toString() || "")
		process.exit(2)
	}
}

profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "betroblox-profile-"))

console.log(`chrome    : ${chromePath}`)
console.log(`nss shim  : ${nssDir || "(not needed)"}`)
console.log(`extension : ${extensionDir}${stagedExtension ? " (staged)" : " (supplied)"}`)
console.log(`profile   : ${profileDir}`)

//
// Launch.
//

const env = { ...process.env }
if(nssDir) {
	env.LD_LIBRARY_PATH = env.LD_LIBRARY_PATH ? `${nssDir}:${env.LD_LIBRARY_PATH}` : nssDir
}

// Port 0 lets the OS choose; the real port comes back on stderr.
child = spawn(chromePath, [
	"--headless=new",
	"--no-sandbox",
	"--disable-gpu",
	"--no-first-run",
	"--no-default-browser-check",
	`--user-data-dir=${profileDir}`,
	`--disable-extensions-except=${extensionDir}`,
	`--load-extension=${extensionDir}`,
	"--remote-debugging-port=0",
	"--remote-debugging-address=127.0.0.1",
	"about:blank"
], { env, stdio: ["ignore", "pipe", "pipe"] })

let stderr = ""
let devtoolsPort = null

child.stderr.on("data", chunk => {
	stderr += chunk.toString()
	const match = stderr.match(/DevTools listening on ws:\/\/127\.0\.0\.1:(\d+)/)
	if(match) { devtoolsPort = Number(match[1]) }
})

child.on("error", ex => {
	console.error(`Failed to launch ${chromePath}: ${ex.message}`)
	cleanup()
	process.exit(2)
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const run = async () => {
	const deadline = Date.now() + timeoutMs
	const failures = []

	while(!devtoolsPort && Date.now() < deadline) {
		if(child.exitCode !== null) {
			console.error(`Chromium exited early (code ${child.exitCode}).`)
			console.error(stderr.split("\n").slice(-15).join("\n"))
			return 2
		}
		await sleep(200)
	}

	if(!devtoolsPort) {
		console.error("Chromium never reported a DevTools port.")
		console.error(stderr.split("\n").slice(-15).join("\n"))
		return 2
	}

	const targets = async () => {
		const res = await fetch(`http://127.0.0.1:${devtoolsPort}/json/list`)
		return res.json()
	}

	let worker = null

	while(!worker && Date.now() < deadline) {
		try {
			worker = (await targets()).find(t =>
				t.type === "service_worker" && t.url.endsWith("/js/serviceworker.js"))
		} catch {}

		if(!worker) { await sleep(300) }
	}

	if(worker) {
		console.log(`PASS      : extension service worker running (${worker.url})`)
	} else {
		failures.push("extension service worker did not start")
	}

	// Real extension load failures surface here; GPU and dbus noise does not.
	const loadErrors = stderr.split("\n").filter(line =>
		/Failed to load extension|Manifest.*(error|is not valid)|Could not load/i.test(line))

	if(loadErrors.length) {
		failures.push(`extension load errors:\n    ${loadErrors.join("\n    ")}`)
	} else {
		console.log("PASS      : no extension load errors reported")
	}

	if(failures.length) {
		console.error(`FAIL      : ${failures.length} problem${failures.length === 1 ? "" : "s"}`)
		for(const failure of failures) { console.error(`  - ${failure}`) }
		return 1
	}

	return 0
}

run().then(code => {
	cleanup()
	console.log("cleaned   : temporary profile and staged extension removed")
	process.exit(code)
})
