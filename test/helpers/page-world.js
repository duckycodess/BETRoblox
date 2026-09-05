"use strict"

// Loads js/inject.js the way a browser page world would, so the document_start
// hooks can be exercised without a browser and without a Roblox login.
//
// Realm isolation is not optional here. js/inject.js replaces
// Object.defineProperty for the life of the realm it runs in, so handing the
// host's Object to the sandbox would chain one test's hook onto the next test's
// and quietly corrupt results. Every load therefore gets its own context, built
// with vm.createContext({}) so the context supplies its own intrinsics.

const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")

const INJECT = path.resolve(__dirname, "../../js/inject.js")

// Kept in step with the lists in injectedFunctions.removeAccessoryLimits.
const ACCESSORY_ASSET_TYPE_IDS = [8, 41, 42, 43, 44, 45, 46, 47, 57, 58]
const LAYERED_ASSET_TYPE_IDS = [64, 65, 66, 67, 68, 69, 70, 71, 72]

// The page-world cache key js/inject.js reads at document_start.
const SETTINGS_CACHE_KEY = "BTRoblox:pageSettings"

// Keep unrelated avatar hooks gated off while leaving the Avatar group enabled
// so the limit hook exercises its real parent-setting gate.
const quietSettings = avatar => ({
	avatar: {
		enabled: avatar.enabled ?? true,
		removeAccessoryLimits: avatar.removeAccessoryLimits ?? false,
		removeLayeredLimits: avatar.removeLayeredLimits ?? false,
		fullRangeBodyColors: false,
		assetRefinement: false
	},
	general: {
		robuxToUSDRate: "none",
		cacheRobuxAmount: false,
		higherRobuxPrecision: false,
		hideAds: false,
		fastSearch: false
	},
	catalog: { enabled: false },
	create: { enabled: false },
	home: {},
	gamedetails: { enabled: false },
	groups: { enabled: false },
	inventory: { enabled: false },
	itemdetails: { enabled: false },
	profile: { enabled: false },
	navigation: { enabled: false }
})

const SETTINGS_ON = { enabled: true, removeAccessoryLimits: true, removeLayeredLimits: true }
const SETTINGS_LAYERED_OFF = { enabled: true, removeAccessoryLimits: true, removeLayeredLimits: false }
const SETTINGS_OFF = { enabled: true, removeAccessoryLimits: false, removeLayeredLimits: false }

// Everything js/inject.js touches at load time. Built inside the context, never
// passed in from the host. Note that URL is a Node global rather than an
// ECMAScript intrinsic, so location has to be a plain object.
const BOOTSTRAP = `
	globalThis.window = globalThis

	const makeStorage = () => {
		const entries = new Map()
		return {
			getItem: key => (entries.has(key) ? entries.get(key) : null),
			setItem: (key, value) => entries.set(key, String(value)),
			removeItem: key => entries.delete(key)
		}
	}

	globalThis.localStorage = makeStorage()
	globalThis.sessionStorage = makeStorage()

	globalThis.CustomEvent = class CustomEvent {
		constructor(type, init) {
			this.type = type
			this.detail = init?.detail
		}
	}

	const listeners = new Map()

	globalThis.document = {
		readyState: "loading",
		contentType: "text/html",
		addEventListener(type, fn) {
			if(!listeners.has(type)) { listeners.set(type, []) }
			listeners.get(type).push(fn)
		},
		dispatchEvent(event) {
			for(const fn of [...(listeners.get(event.type) ?? [])]) { fn(event) }
			return true
		},
		querySelector: () => null,
		createElement: () => ({ style: {}, setAttribute() {}, append() {}, remove() {} }),
		documentElement: { classList: { add() {}, toggle() {} }, dataset: {}, append() {}, prepend() {} },
		head: null,
		body: null
	}

	globalThis.fetch = () => Promise.reject(new Error("network is not available in tests"))
	globalThis.XMLHttpRequest = class {
		open() {} send() {} setRequestHeader() {} addEventListener() {}
	}
	globalThis.MutationObserver = class { observe() {} disconnect() {} }
	globalThis.location = {
		href: "https://www.roblox.com/my/avatar",
		protocol: "https:",
		host: "www.roblox.com",
		hostname: "www.roblox.com",
		pathname: "/my/avatar",
		search: ""
	}
`

/**
 * A stand-in for the avatar rules module, shaped like Roblox's: getAssetTypeById
 * hands back a cached entry, so raising maxNumber mutates shared state. This is
 * the shape that makes restore-on-disable matter.
 */
const cachingRules = () => {
	const cache = new Map()

	return {
		getAdvancedAccessoryLimit: assetTypeId => ({ id: assetTypeId, limit: 3 }),
		maxNumberOfLayeredClothingItems: 5,
		getAssetTypeById(assetTypeId) {
			if(!cache.has(assetTypeId)) { cache.set(assetTypeId, { id: assetTypeId, maxNumber: 3 }) }
			return cache.get(assetTypeId)
		},
		// Roblox drops what exceeds its caps: 3 accessories, 1 per layered category.
		addAssetToAvatar(asset, current) {
			const kept = []
			const layeredSeen = new Set()
			let accessories = 0

			for(const candidate of [asset, ...current]) {
				const id = candidate?.assetType?.id

				if(ACCESSORY_ASSET_TYPE_IDS.includes(id)) {
					if(accessories++ < 3) { kept.push(candidate) }
				} else if(LAYERED_ASSET_TYPE_IDS.includes(id)) {
					if(!layeredSeen.has(id)) {
						layeredSeen.add(id)
						kept.push(candidate)
					}
				} else {
					kept.push(candidate)
				}
			}

			return kept
		}
	}
}

/** Same contract, but every call returns a fresh object. */
const freshRules = () => {
	const caching = cachingRules()

	return {
		...caching,
		getAssetTypeById: assetTypeId => ({ id: assetTypeId, maxNumber: 3 })
	}
}

const loadInject = ({ avatar = SETTINGS_ON } = {}) => {
	const context = vm.createContext({})
	const run = code => vm.runInContext(code, context)

	run(BOOTSTRAP)

	// Timers and console come from the host; they are not realm-sensitive.
	context.console = console
	context.setTimeout = setTimeout
	context.clearTimeout = clearTimeout
	context.setInterval = setInterval
	context.clearInterval = clearInterval

	context.__settings = JSON.stringify(quietSettings(avatar))
	run(`localStorage.setItem(${JSON.stringify(SETTINGS_CACHE_KEY)}, __settings)`)

	vm.runInContext(fs.readFileSync(INJECT, "utf8"), context, { filename: "js/inject.js" })

	return {
		context,

		/** Emulates the content script pushing new settings into the page world. */
		updateSettings(avatarSettings) {
			context.__next = quietSettings(avatarSettings)
			run(`document.dispatchEvent(new CustomEvent("btroblox/inject/updateSettings", { detail: [__next, null] }))`)
		},

		/** Emulates the initial settings delivery from the isolated world. */
		initSettings(avatarSettings) {
			context.__next = quietSettings(avatarSettings)
			run(`document.dispatchEvent(new CustomEvent("btroblox/init", { detail: [__next, false, null] }))`)
		},

		/** Emulates the avatar bundle publishing its private rules module. */
		defineRules(rules) {
			context.__rules = rules
			return run(`(() => {
				const namespace = {}
				for(const key of Object.keys(__rules)) {
					Object.defineProperty(namespace, key, {
						enumerable: true,
						configurable: true,
						get: () => __rules[key]
					})
				}
				return namespace
			})()`)
		},

		/** Object.defineProperty from inside the realm, so the hook sees it. */
		defineOn(object, key, descriptor) {
			context.__object = object
			context.__key = key
			context.__descriptor = descriptor
			run(`Object.defineProperty(__object, __key, __descriptor)`)
		},

		descriptorOf(object, key) {
			context.__object = object
			context.__key = key
			return run(`Object.getOwnPropertyDescriptor(__object, __key)`)
		}
	}
}

module.exports = {
	ACCESSORY_ASSET_TYPE_IDS,
	LAYERED_ASSET_TYPE_IDS,
	SETTINGS_ON,
	SETTINGS_LAYERED_OFF,
	SETTINGS_OFF,
	cachingRules,
	freshRules,
	loadInject
}
