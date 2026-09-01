"use strict"

let currentPage

// The phase-one shell is deliberately small: it orients the player, then gets
// out of the way so Roblox still owns the familiar task surface below it.
const DUCKY_PAGE_LABELS = {
	catalog: "Marketplace",
	itemdetails: "Item details",
	avatar: "Avatar studio"
}

const DUCKY_PAGE_NAMES = new Set(Object.keys(DUCKY_PAGE_LABELS))
const DUCKY_UI_CONTRACT = [
	"DUCKY UI CONTRACT",
	"THESIS: Roblox's useful controls should read like a workbench: predictable routes, visible state, and actions at the edge of the task.",
	"OWN-WORLD: cool slate canvas, white work surfaces, electric-blue navigation, coral commit actions, compact labels, no decorative noise.",
	"STORY: arrive -> orient -> refine -> act -> verify.",
	"FIRST VIEWPORT: current page, primary route, and native task are clear before the content begins.",
	"FORM: a route shell sits above the page; search and filters stay grouped; cards recede behind readable metadata.",
	"ACCESSIBILITY: keyboard focus, contrast, reduced motion, and non-color state cues are first-class.",
	"FINISH: focus survives every transition; empty, loading, and disabled states remain legible.",
	"DIRECTION: catalog-workbench / candidate 7 / seed 68939259"
].join("\n")

let duckyShell
let duckyShellObserver

const installDuckyContract = () => {
	if(!document.body || document.body.dataset.btrDuckyContract) { return }

	document.body.dataset.btrDuckyContract = "installed"
	document.body.prepend(document.createComment(DUCKY_UI_CONTRACT))
}

const createDuckyShell = container => {
	const content = container.querySelector("#content")
	if(!content) { return null }

	const shell = document.createElement("section")
	shell.id = "btr-ducky-shell"
	shell.className = "btr-ducky-shell"
	shell.setAttribute("aria-label", "BTR workspace")
	shell.innerHTML = `
		<a class="btr-ducky-brand" href="/catalog" aria-label="BTR workspace home">
			<span class="btr-ducky-brand-mark" aria-hidden="true"><span></span></span>
			<span class="btr-ducky-brand-copy"><strong>BTR</strong><small>WORKSPACE</small></span>
		</a>
		<div class="btr-ducky-current">
			<span class="btr-ducky-kicker">CURRENT VIEW</span>
			<strong data-btr-ducky-current-label>Marketplace</strong>
		</div>
		<nav class="btr-ducky-nav" aria-label="BTR workspace routes">
			<a data-btr-ducky-route="catalog" href="/catalog">Marketplace</a>
			<a data-btr-ducky-route="avatar" href="/my/avatar">Avatar studio</a>
		</nav>
		<button class="btr-ducky-settings" data-btr-ducky-settings type="button" aria-label="Open BETRoblox settings">
			<span class="btr-ducky-settings-icon" aria-hidden="true"></span>
			<span>Settings</span>
		</button>
	`

	const settingsButton = shell.querySelector("[data-btr-ducky-settings]")
	settingsButton.addEventListener("click", () => {
		const nativeToggle = document.querySelector(".btr-settings-toggle")
		if(nativeToggle) {
			nativeToggle.click()
			return
		}

		const url = new URL(location.href)
		url.searchParams.set("btr_settings_open", "true")
		location.assign(url.toString())
	})

	content.before(shell)
	return shell
}

const updateDuckyShell = page => {
	const root = document.documentElement
	const isPhaseOnePage = DUCKY_PAGE_NAMES.has(page?.name)
	root.classList.toggle("btr-ducky-ui", isPhaseOnePage)
	root.dataset.btrPage = page?.name || ""

	if(!isPhaseOnePage) {
		duckyShell?.remove()
		duckyShell = null
		duckyShellObserver?.disconnect()
		duckyShellObserver = null
		return
	}

	installDuckyContract()
	const container = document.querySelector("#container-main")
	const content = container?.querySelector("#content")
	if(!container || !content) {
		if(!duckyShellObserver && document.documentElement) {
			duckyShellObserver = new MutationObserver(() => updateDuckyShell(currentPage))
			duckyShellObserver.observe(document.documentElement, { childList: true, subtree: true })
		}
		return
	}

	duckyShellObserver?.disconnect()
	duckyShellObserver = null
	duckyShell = container.querySelector("#btr-ducky-shell") || createDuckyShell(container)
	if(!duckyShell) { return }

	duckyShell.dataset.view = page.name
	duckyShell.querySelector("[data-btr-ducky-current-label]").textContent = DUCKY_PAGE_LABELS[page.name]
	const activeRoute = page.name === "itemdetails" ? "catalog" : page.name

	for(const link of duckyShell.querySelectorAll("[data-btr-ducky-route]")) {
		const active = link.dataset.btrDuckyRoute === activeRoute
		link.classList.toggle("active", active)
		if(active) {
			link.setAttribute("aria-current", "page")
		} else {
			link.removeAttribute("aria-current")
		}
	}
}

//

const PAGE_INFO = {
	avatar: {
		matches: ["^/my/avatar"],
		js: ["pages/avatar.js"],
		css: ["avatar.css"]
	},
	catalog: {
		matches: ["^/catalog/?$"],
		js: ["pages/catalog.js"],
		css: ["catalog.css"]
	},
	friends: {
		matches: ["^/users/(\\d+)/friends", "^/users/friends"],
		js: ["pages/friends.js"],
		css: []
	},
	gamedetails: {
		matches: ["^/games/(\\d+)/"],
		js: ["pages/gamedetails.js"],
		css: ["gamedetails.css"]
	},
	games: {
		matches: ["^/(games|discover)/?$"],
		js: [],
		css: ["games.css"]
	},
	groups: {
		matches: ["^/groups/(\\d+)/*", "^/communities/(\\d+)/*"],
		js: ["pages/groups.js"],
		css: ["groups.css"]
	},
	groupadmin: {
		matches: ["^/groups/configure$", "^/communities/configure$"],
		js: ["pages/groupadmin.js"],
		css: []
	},
	home: {
		matches: ["^/home"],
		js: ["pages/home.js"],
		css: ["home.css"]
	},
	inventory: {
		matches: ["^/users/(\\d+)/inventory"],
		js: ["pages/inventory.js"],
		css: ["inventory.css"]
	},
	itemdetails: {
		matches: ["^/(catalog|library|game-pass|badges|bundles)/(\\d+)/"],
		js: ["pages/itemdetails.js"],
		css: ["itemdetails.css"]
	},
	membership: {
		matches: ["^/premium/membership"],
		js: [],
		css: []
	},
	messages: {
		matches: ["^/my/messages"],
		js: [],
		css: ["messages.css"]
	},
	money: {
		matches: ["^/transactions"],
		js: ["pages/money.js"],
		css: ["money.css"]
	},
	profile: {
		matches: ["^/users/(\\d+)/profile"],
		js: ["pages/profile.js"],
		css: ["profile.css"]
	},
	universeconfig: {
		matches: ["^/universes/configure"],
		js: [],
		css: ["universeconfig.css"]
	},
	
	create_dashboard: {
		domainMatches: ["create.roblox.com"],
		matches: ["^/dashboard/"],
		js: ["pages/create_dashboard.js"],
		css: ["create_dashboard.css"]
	},
	create_store: {
		domainMatches: ["create.roblox.com"],
		matches: ["^/store/"],
		js: ["pages/create_store.js"],
		css: ["create_store.css"]
	},
}

//

const backgroundScript = {
	callbacks: {},
	responseCounter: 0,
	
	resetTimeout() {
		if(this.portTimeout) {
			clearTimeout(this.portTimeout)
			this.portTimeout = null
		}
		
		if(this.port && Object.keys(this.callbacks).length === 0) {
			this.portTimeout = setTimeout(() => this.disconnectPort(), 10e3)
		}
	},
	
	initPort() {
		if(this.port) { return }
		if(!chrome.runtime?.id) { return } // dont try to create a port if extension context is invalidated
		
		const port = chrome.runtime.connect()
		this.port = port
		
		port.onMessage.addListener(msg => this.onPortMessage(port, msg))
		port.onDisconnect.addListener(() => {
			if(chrome.runtime.lastError) {} // Clear lastError
			this.disconnectPort()
		})
		
		this.resetTimeout()
	},
	
	disconnectPort() {
		if(!this.port) { return }
		this.port.disconnect()
		this.port = null
		
		this.callbacks = {}
		this.resetTimeout()
	},
	
	onPortMessage(port, msg) {
		const fn = this.callbacks[msg.id]
		if(!fn) { return }

		if(msg.final) {
			delete this.callbacks[msg.id]
			this.resetTimeout()
			
			if(msg.cancel) { return }
		}

		fn(msg.data)
	},
	
	send(name, data, callback) {
		if(typeof data === "function") {
			callback = data
			data = null
		}
		
		const info = { name, data }
		
		if(typeof callback === "function") {
			const id = info.id = this.responseCounter++
			this.callbacks[id] = callback
		}
		
		if(!this.port) { this.initPort() }
		if(this.port) {
			this.port.postMessage(info)
			this.resetTimeout()
		}
	}
}

const injectScript = {
	messageListeners: {},
	
	call(name, fn, ...args) {
		this.send("call", name, args)
	},

	send(action, ...args) {
		document.dispatchEvent(new CustomEvent(`btroblox/inject/${action}`, {
			detail: IS_FIREFOX ? cloneInto(args, window, { cloneFunctions: true, wrapReflectors: true }) : args
		}))
	},

	listen(action, callback, params) {
		let listeners = this.messageListeners[action]
		
		if(!listeners) {
			listeners = this.messageListeners[action] = []
			
			document.addEventListener(`btroblox/content/${action}`, ev => {
				let args
				
				try { args = IS_FIREFOX ? cloneInto(ev.detail, window, { cloneFunctions: true, wrapReflectors: true }) : ev.detail }
				catch(ex) {}
				
				args = Array.isArray(args) ? args : []
				
				for(let i = listeners.length; i--;) {
					try { listeners[i].apply(null, args) }
					catch(ex) { console.error(ex) }
				}
			}, { once: params?.once })
		}
		
		listeners.push(callback)
	},
	
	init(...args) {
		document.dispatchEvent(new CustomEvent(`btroblox/init`, {
			detail: IS_FIREFOX ? cloneInto(args, window, { cloneFunctions: true, wrapReflectors: true }) : args
		}))
	}
}

//

const activeStyleSheets = {}
const reloadingStyleSheets = {}

const startReloadingCSS = (path, skipFirst) => {
	if(reloadingStyleSheets[path]) { return }
	
	const styleSheet = activeStyleSheets[path]
	if(!styleSheet) { return }
	
	const key = Date.now()
	reloadingStyleSheets[path] = key
	
	let lastCssText
	
	setInterval(async () => {
		if(reloadingStyleSheets[path] !== key) { return }
		if(document.visibilityState === "hidden") { return }
		if(!chrome.runtime?.id) { return } // Stop if extension context is invalidated
		
		const newUrl = `${chrome.runtime.getURL(path)}?_=${Date.now()}`
		
		const res = await fetch(newUrl)
		const cssText = await res.text()
		
		if(reloadingStyleSheets[path] !== key) { return }
		
		if(lastCssText !== cssText && (lastCssText || !skipFirst)) {
			styleSheet.href = newUrl
		}
		
		lastCssText = cssText
	}, 2000)
}

const insertCSS = (...paths) => {
	for(const path of paths) {
		if(activeStyleSheets[path]) { continue }
		
		const styleSheet = document.createElement("link")
		styleSheet.href = SETTINGS.get("general.themeHotReload") ? `${chrome.runtime.getURL(path)}?_=${Date.now()}` : chrome.runtime.getURL(path)
		styleSheet.rel = "stylesheet"
		
		const parent = document.head || document.documentElement
		parent.append(styleSheet)
		
		activeStyleSheets[path] = styleSheet
		
		if(SETTINGS.get("general.themeHotReload")) {
			startReloadingCSS(path, true)
		}
	}
}

const removeCSS = (...paths) => {
	for(const path of paths) {
		const styleSheet = activeStyleSheets[path]
		if(!styleSheet) { continue }
		
		styleSheet.remove()
		delete activeStyleSheets[path]
		delete reloadingStyleSheets[path]
	}
}

//

let currentPageCSS = []

const updatePageCSS = () => {
	const cssFiles = ["main.css", "settingsmodal.css"]
	
	if(location.host === "create.roblox.com") {
		cssFiles.push("create.css")
	}
	
	if(currentPage?.css) {
		cssFiles.push(...currentPage.css)
	}
	
	const theme = SETTINGS.get("general.theme")

	if(theme !== "default") {
		cssFiles.push(...cssFiles.map(path => `${theme}/${path}`))
	}

	// Loaded last so the phase-one shell and page treatment remain coherent
	// across the legacy theme files and page-specific styles.
	cssFiles.push("ducky.css")

	// Re-append the override sheet when the theme changes; active link sheets
	// otherwise keep their original order and could place a theme after it.
	removeCSS("css/ducky.css")
	insertCSS(...cssFiles.map(path => `css/${path}`))
	removeCSS(...currentPageCSS.filter(path => !cssFiles.includes(path)).map(path => `css/${path}`))

	currentPageCSS = cssFiles
}

//

if(document.contentType === "text/html" && location.protocol !== "blob" && document.readyState === "loading" && !document.documentElement.getAttribute("btr-loaded")) {
	document.documentElement.setAttribute("btr-loaded", "true")
	
	SETTINGS.load(() => {
		injectScript.init(
			SETTINGS.serialize(),
			IS_DEV_MODE,
			RobuxToCash.getSelectedOption()
		)
		
		//
		
		const initialized = {}
		
		const getCurrentPage = () => {
			for(const [name, page] of Object.entries(PAGE_INFO)) {
				const domainMatches = page.domainMatches ?? ["www.roblox.com", "web.roblox.com"]
				
				if(!domainMatches.includes(location.hostname)) {
					continue
				}
				
				for(let pattern of page.matches) {
					// Add support for locale urls
					if(pattern.startsWith("^")) {
						pattern = `^(?:/\\w{2}|/\\w{2}-\\w{2,3})?${pattern.slice(1)}`
					}
					//
					
					const matches = location.pathname.match(new RegExp(pattern, "i"))
					if(matches) {
						return { ...page, name, matches: matches.slice(1) }
					}
				}
			}
			
			return null
		}
		
		const onPageChanged = () => {
			if(currentPage) {
				if(pageReset[currentPage.name]) {
					for(const fn of pageReset[currentPage.name]) {
						try { fn.apply(null, currentPage.matches) }
						catch(ex) { console.error(ex) }
					}
				}
			}
			
			currentPage = getCurrentPage()
			
			updateDuckyShell(currentPage)
			injectScript.send("setCurrentPage", currentPage ? { name: currentPage.name, matches: currentPage.matches } : null)
			updatePageCSS()
			
			if(!initialized.common) {
				initialized.common = true
				
				if(location.host === "create.roblox.com") {
					try { pageInit.create() }
					catch(ex) { console.error(ex) }
				} else {
					try { pageInit.www() }
					catch(ex) { console.error(ex) }
				}
			}
			
			if(currentPage) {
				if(!initialized[currentPage.name]) {
					initialized[currentPage.name] = true
					
					if(pageInit[currentPage.name]) {
						try { pageInit[currentPage.name]() }
						catch(ex) { console.error(ex) }
					}
				}
				
				if(pageLoad[currentPage.name]) {
					for(const fn of pageLoad[currentPage.name]) {
						try { fn.apply(null, currentPage.matches) }
						catch(ex) { console.error(ex) }
					}
				}
			}
		}
		
		injectScript.listen("onPageChanged", onPageChanged)
		onPageChanged()
		
		if(location.host === "create.roblox.com") {
		} else {
			document.$watch("#content", content => {
				const marker = html`<div id=btr-detect-content style=display:none></div>`
				content.append(marker)
				
				new MutationObserver(() => {
					if(!marker.parentNode) {
						content.append(marker)
						onPageChanged()
					}
				}).observe(content, { childList: true })
			})
		}
		
		//
		
		// Keep document_start hooks in sync when a local preference changes. Hooks
		// decide their behavior per call, so this does not require a page reload.
		SETTINGS.onChange(() => {
			injectScript.send("updateSettings", SETTINGS.serialize(), RobuxToCash.getSelectedOption())
		})
		SETTINGS.onChange("general.theme", () => updatePageCSS())
	})
	
	SHARED_DATA.init()
	
	backgroundScript.send("checkPermissions", hasPermissions => {
		if(!hasPermissions) {
			const oldBanner = $("#btr-permission-banner")
			if(oldBanner) { oldBanner.remove() }
			
			const alert = html`
			<div id=btr-permission-banner style="position:fixed;width:100%;height:24px;left:0;top:40px;background:red;color:white;cursor:pointer;z-index:100000;text-align:center;user-select:none;">
				BETRoblox needs some permissions to work properly. Click here or click the extension button to fix the issue.
			</div>`
			
			document.$watch(">body").$then(body => body.append(alert))
			
			if(IS_CHROME) {
				alert.$on("click", () => {
					backgroundScript.send("requestPermissions", wasGranted => {
						if(wasGranted) {
							location.pathname = location.pathname
						}
					})
				})
			} else {
				alert.textContent = `BETRoblox needs some permissions to work properly. Click the extension button to fix the issue.`
				alert.style.cursor = ""
			}
		}
	})
}
