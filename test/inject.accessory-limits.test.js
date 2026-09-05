"use strict"

// Regression coverage for injectedFunctions.removeAccessoryLimits in
// js/inject.js. These hooks are fragile: they intercept Object.defineProperty
// to reach an avatar rules module Roblox keeps private, and they have to keep
// working when the user toggles the setting without reloading the page.
//
// Runs with no dependencies and no Roblox login:  node --test test/
//
// What this cannot cover: whether Roblox's live bundle still publishes those
// keys through defineProperty getters at all. If Roblox changes that, these
// tests still pass while the hook silently does nothing. That gap belongs to
// the authenticated QA in docs/QA_PHASE_ONE.md.

const test = require("node:test")
const assert = require("node:assert/strict")

const {
	ACCESSORY_ASSET_TYPE_IDS,
	LAYERED_ASSET_TYPE_IDS,
	SETTINGS_ON,
	SETTINGS_LAYERED_OFF,
	SETTINGS_OFF,
	cachingRules,
	freshRules,
	loadInject
} = require("./helpers/page-world.js")

const RAISED_LIMIT = 100
const ORIGINAL_LAYERED_LIMIT = 5
const ORIGINAL_MAX_NUMBER = 3

const accessory = assetTypeId => ({ assetType: { id: assetTypeId } })

const setup = (avatar = SETTINGS_ON, rules = cachingRules()) => {
	const page = loadInject({ avatar })
	return { page, namespace: page.defineRules(rules) }
}

//
// getAdvancedAccessoryLimit
//

test("getAdvancedAccessoryLimit bypasses only supported asset types", () => {
	const { namespace } = setup()

	for(const assetTypeId of [...ACCESSORY_ASSET_TYPE_IDS, ...LAYERED_ASSET_TYPE_IDS]) {
		assert.equal(namespace.getAdvancedAccessoryLimit(assetTypeId), undefined,
			`asset type ${assetTypeId} should be bypassed`)
	}

	// Shirt, T-shirt, and pants are not accessories and must keep their limit.
	for(const assetTypeId of [1, 11, 18]) {
		assert.deepEqual(namespace.getAdvancedAccessoryLimit(assetTypeId), { id: assetTypeId, limit: 3 },
			`asset type ${assetTypeId} should pass through`)
	}
})

test("getAdvancedAccessoryLimit preserves original behavior when disabled", () => {
	const { namespace } = setup(SETTINGS_OFF)

	for(const assetTypeId of [8, 41, 64, 72]) {
		assert.deepEqual(namespace.getAdvancedAccessoryLimit(assetTypeId), { id: assetTypeId, limit: 3 })
	}
})

//
// maxNumberOfLayeredClothingItems
//

test("maxNumberOfLayeredClothingItems is raised when enabled and original when disabled", () => {
	assert.equal(setup().namespace.maxNumberOfLayeredClothingItems, RAISED_LIMIT)
	assert.equal(setup(SETTINGS_OFF).namespace.maxNumberOfLayeredClothingItems, ORIGINAL_LAYERED_LIMIT)
})

// The regression that motivated Fix A: the replacement here is a plain number,
// so latching it on first read froze the value for the life of the page.
test("maxNumberOfLayeredClothingItems follows a live toggle after being read", () => {
	const { page, namespace } = setup()

	assert.equal(namespace.maxNumberOfLayeredClothingItems, RAISED_LIMIT)

	page.updateSettings(SETTINGS_OFF)
	assert.equal(namespace.maxNumberOfLayeredClothingItems, ORIGINAL_LAYERED_LIMIT,
		"disabling must restore the original limit without a reload")

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.maxNumberOfLayeredClothingItems, RAISED_LIMIT)
})

test("layered-only toggle preserves accessory bypass and restores cached layered entries", () => {
	const { page, namespace } = setup()
	const layeredEntry = namespace.getAssetTypeById(64)
	const accessoryEntry = namespace.getAssetTypeById(41)

	assert.equal(namespace.getAdvancedAccessoryLimit(64), undefined)
	assert.equal(layeredEntry.maxNumber, RAISED_LIMIT)
	assert.equal(accessoryEntry.maxNumber, RAISED_LIMIT)

	page.updateSettings(SETTINGS_LAYERED_OFF)

	assert.deepEqual(namespace.getAdvancedAccessoryLimit(64), { id: 64, limit: 3 })
	assert.equal(namespace.maxNumberOfLayeredClothingItems, ORIGINAL_LAYERED_LIMIT)
	assert.equal(layeredEntry.maxNumber, ORIGINAL_MAX_NUMBER,
		"disabling layered limits must restore stale cached entries")
	assert.equal(namespace.getAssetTypeById(64), layeredEntry)
	assert.equal(layeredEntry.maxNumber, ORIGINAL_MAX_NUMBER)
	assert.equal(accessoryEntry.maxNumber, RAISED_LIMIT,
		"an accessory entry must remain raised while its setting is on")

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.getAdvancedAccessoryLimit(64), undefined)
	assert.equal(namespace.getAssetTypeById(64), layeredEntry)
	assert.equal(layeredEntry.maxNumber, RAISED_LIMIT)
})

//
// getAssetTypeById
//

test("getAssetTypeById raises maxNumber only for supported asset types", () => {
	const { namespace } = setup()

	for(const assetTypeId of [...ACCESSORY_ASSET_TYPE_IDS, ...LAYERED_ASSET_TYPE_IDS]) {
		assert.equal(namespace.getAssetTypeById(assetTypeId).maxNumber, RAISED_LIMIT)
	}

	for(const assetTypeId of [1, 11, 18]) {
		assert.equal(namespace.getAssetTypeById(assetTypeId).maxNumber, ORIGINAL_MAX_NUMBER)
	}
})

test("getAssetTypeById preserves original behavior when disabled", () => {
	for(const rules of [cachingRules(), freshRules()]) {
		const { namespace } = setup(SETTINGS_OFF, rules)
		assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)
	}
})

test("getAssetTypeById returns the same object across repeated calls and toggles", () => {
	const { page, namespace } = setup()
	const entry = namespace.getAssetTypeById(41)

	assert.equal(namespace.getAssetTypeById(41), entry, "repeated calls must not clone")

	page.updateSettings(SETTINGS_OFF)
	assert.equal(namespace.getAssetTypeById(41), entry, "identity must survive a disable")

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.getAssetTypeById(41), entry, "identity must survive a re-enable")
})

// Fix B. Roblox caches rule entries, so raising maxNumber in place mutates
// shared state; disabling has to put it back for every entry already raised,
// including ones the page never looks up again.
test("disabling restores maxNumber on cached entries, including stale references", () => {
	const { page, namespace } = setup()

	const looked_up_again = namespace.getAssetTypeById(41)
	const never_looked_up_again = namespace.getAssetTypeById(64)
	const untouched = namespace.getAssetTypeById(1)

	assert.equal(looked_up_again.maxNumber, RAISED_LIMIT)
	assert.equal(never_looked_up_again.maxNumber, RAISED_LIMIT)
	assert.equal(untouched.maxNumber, ORIGINAL_MAX_NUMBER)

	page.updateSettings(SETTINGS_OFF)

	assert.equal(looked_up_again.maxNumber, ORIGINAL_MAX_NUMBER)
	assert.equal(never_looked_up_again.maxNumber, ORIGINAL_MAX_NUMBER,
		"an entry the page never reads again must still be restored")
	assert.equal(untouched.maxNumber, ORIGINAL_MAX_NUMBER)
})

test("initial btroblox/init settings also restore raised cached entries", () => {
	const { page, namespace } = setup()
	const entry = namespace.getAssetTypeById(41)

	assert.equal(entry.maxNumber, RAISED_LIMIT)

	page.initSettings(SETTINGS_OFF)

	assert.equal(entry.maxNumber, ORIGINAL_MAX_NUMBER,
		"the initial settings delivery must restore stale references too")
})

test("re-enabling raises a previously restored entry on its next lookup", () => {
	const { page, namespace } = setup()

	const entry = namespace.getAssetTypeById(41)
	page.updateSettings(SETTINGS_OFF)
	assert.equal(entry.maxNumber, ORIGINAL_MAX_NUMBER)

	page.updateSettings(SETTINGS_ON)

	// Raising stays lazy on purpose: a stale reference reading the original cap
	// under-permits, which is the safe direction.
	assert.equal(namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)
	assert.equal(entry.maxNumber, RAISED_LIMIT)
	assert.equal(namespace.getAssetTypeById(41), entry)
})

test("repeated raise and restore cycles do not drift", () => {
	const { page, namespace } = setup()

	for(let i = 0; i < 3; i++) {
		assert.equal(namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)
		assert.equal(namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)

		page.updateSettings(SETTINGS_OFF)
		assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)

		page.updateSettings(SETTINGS_ON)
	}
})

//
// addAssetToAvatar
//

// Issue #2 asks for a cap of 100. Upstream ReBTRoblox keeps 10; BETRoblox
// diverges deliberately, and whether the live editor stays responsive at these
// counts is an authenticated-QA question, not something this test can answer.
test("addAssetToAvatar restores category-dropped assets up to the raised cap", () => {
	const { namespace } = setup()

	const worn = [...Array(11)].map(() => accessory(8))
	worn.push(accessory(11))

	const kept = namespace.addAssetToAvatar(accessory(8), worn)

	assert.equal(kept.length, 13, "the original would have dropped all but 3 accessories")
	assert.equal(kept.filter(item => item.assetType.id === 8).length, 12)
	assert.equal(kept.filter(item => item.assetType.id === 11).length, 1)
})

test("addAssetToAvatar enforces the raised cap at 100", () => {
	const { namespace } = setup()
	const worn = [...Array(100)].map(() => accessory(8))

	const kept = namespace.addAssetToAvatar(accessory(8), worn)

	assert.equal(kept.length, 100)
	assert.equal(kept.filter(item => item.assetType.id === 8).length, 100)
})

test("addAssetToAvatar keeps duplicate layered clothing in the same category", () => {
	const { namespace } = setup()

	const kept = namespace.addAssetToAvatar(accessory(64), [accessory(64), accessory(64), accessory(65)])

	// Array.from rather than .map: the returned array belongs to the sandbox
	// realm, and strict deep equality also compares prototypes.
	assert.deepEqual(Array.from(kept, item => item.assetType.id), [64, 64, 64, 65])
})

test("addAssetToAvatar follows the layered-clothing toggle", () => {
	const { page, namespace } = setup()
	const worn = [accessory(64), accessory(64)]

	assert.equal(namespace.addAssetToAvatar(accessory(64), worn).length, 3)

	page.updateSettings(SETTINGS_LAYERED_OFF)
	assert.equal(namespace.addAssetToAvatar(accessory(64), worn).length, 1,
		"the original category cap must apply while layered limits are disabled")

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.addAssetToAvatar(accessory(64), worn).length, 3)
})

test("addAssetToAvatar honors the original caps when disabled", () => {
	const { namespace } = setup(SETTINGS_OFF)

	const worn = [...Array(11)].map(() => accessory(8))
	worn.push(accessory(11))

	const kept = namespace.addAssetToAvatar(accessory(8), worn)

	assert.equal(kept.length, 4, "3 accessories plus the non-accessory")
})

test("addAssetToAvatar follows a live toggle", () => {
	const { page, namespace } = setup()

	const worn = [...Array(11)].map(() => accessory(8))
	assert.equal(namespace.addAssetToAvatar(accessory(8), worn).length, 12)

	page.updateSettings(SETTINGS_OFF)
	assert.equal(namespace.addAssetToAvatar(accessory(8), worn).length, 3)

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.addAssetToAvatar(accessory(8), worn).length, 12)
})

//
// Descriptor semantics
//

test("the hooked descriptor keeps enumerable, configurable and any setter", () => {
	const page = loadInject()
	const namespace = {}
	let setterCalls = 0

	page.defineOn(namespace, "maxNumberOfLayeredClothingItems", {
		enumerable: false,
		configurable: true,
		get: () => ORIGINAL_LAYERED_LIMIT,
		set: () => { setterCalls++ }
	})

	const descriptor = page.descriptorOf(namespace, "maxNumberOfLayeredClothingItems")

	assert.equal(descriptor.enumerable, false)
	assert.equal(descriptor.configurable, true)
	assert.equal(typeof descriptor.set, "function")

	namespace.maxNumberOfLayeredClothingItems = 9
	assert.equal(setterCalls, 1, "the original setter must stay reachable")
})

test("a data descriptor is passed through untouched", () => {
	const page = loadInject()
	const namespace = {}

	page.defineOn(namespace, "getAssetTypeById", {
		enumerable: true,
		configurable: true,
		writable: true,
		value: assetTypeId => ({ id: assetTypeId, maxNumber: ORIGINAL_MAX_NUMBER })
	})

	// No getter to wrap, so the hook must not interfere.
	assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)
})

test("unrelated keys are not intercepted", () => {
	const page = loadInject()
	const namespace = {}

	page.defineOn(namespace, "someUnrelatedRule", { enumerable: true, configurable: true, get: () => 7 })

	assert.equal(namespace.someUnrelatedRule, 7)
})

//
// Realm isolation
//

// js/inject.js replaces Object.defineProperty for the life of its realm. If a
// harness shared one realm across tests, each load would chain onto the last.
test("each load is isolated from the others", () => {
	const first = setup()
	const second = setup()

	assert.equal(first.namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)
	assert.equal(second.namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)

	first.page.updateSettings(SETTINGS_OFF)

	assert.equal(first.namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)
	assert.equal(second.namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT,
		"one realm's toggle must not reach another realm's hooks")
})

// Documents an inherited limit rather than asserting a fix. The eager hook list
// in js/inject.js is gated on the cached settings at document_start, so a page
// that loads with the setting already off never installs the hook and enabling
// it live does nothing until reload. The settings default to true, so this only
// bites after a deliberate disable, and the settings modal already tells users
// to refresh. Turning the setting off and back on within one page works.
test("a page loaded with the bypass off does not install the hook until reload", () => {
	const { page, namespace } = setup(SETTINGS_OFF)

	assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)

	page.updateSettings(SETTINGS_ON)

	assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER,
		"hook installation is decided once, at document_start")
})

test("disabling the Avatar group restores the limit hook's changes", () => {
	const { page, namespace } = setup()
	const entry = namespace.getAssetTypeById(41)

	page.updateSettings({ enabled: false, removeAccessoryLimits: true, removeLayeredLimits: true })

	assert.deepEqual(namespace.getAdvancedAccessoryLimit(8), { id: 8, limit: 3 })
	assert.equal(entry.maxNumber, ORIGINAL_MAX_NUMBER)
	assert.equal(namespace.maxNumberOfLayeredClothingItems, ORIGINAL_LAYERED_LIMIT)

	page.updateSettings(SETTINGS_ON)
	assert.equal(namespace.getAdvancedAccessoryLimit(8), undefined)
	assert.equal(namespace.getAssetTypeById(41).maxNumber, RAISED_LIMIT)
})

test("a disabled Avatar group does not install the limit hook", () => {
	const { namespace } = setup({ enabled: false, removeAccessoryLimits: true, removeLayeredLimits: true })

	assert.deepEqual(namespace.getAdvancedAccessoryLimit(8), { id: 8, limit: 3 })
	assert.equal(namespace.getAssetTypeById(41).maxNumber, ORIGINAL_MAX_NUMBER)
})
