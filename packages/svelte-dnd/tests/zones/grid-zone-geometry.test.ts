import { describe, it, expect } from 'vitest'
import { GridZoneGeometry } from '../../src/lib/core/zones/geometries/grid-zone-geometry.js'
import { geometryCtx, slotRect } from '../helpers/fixtures.js'

const GRID_RECT = {
	x: 0,
	y: 0,
	left: 0,
	top: 0,
	right: 400,
	bottom: 400,
	width: 400,
	height: 400,
	toJSON: () => ({})
} as DOMRect

const ctx = (partial: Parameters<typeof geometryCtx>[0] = {}) =>
	geometryCtx({ containerId: 'grid', containerRect: GRID_RECT, ...partial })

const rect = (slotId: string, position: number, x: number, y: number, w = 100, h = 100) =>
	slotRect(slotId, position, x, y, w, h)

describe('GridZoneGeometry — row flow', () => {
	const geometry = new GridZoneGeometry('row')

	it('emits an empty zone with at-least 20px height for an empty grid', () => {
		const zones = geometry.buildZones([], ctx())
		expect(zones).toHaveLength(1)
		expect(zones[0].layout).toBe('grid')
		expect(zones[0].rect.height).toBeGreaterThanOrEqual(20)
	})

	it('groups items on the same row into one track and emits 2 zones per item', () => {
		// Two items on the same row at y=0
		const rects = [rect('a', 0, 0, 0), rect('b', 1, 100, 0)]
		const zones = geometry.buildZones(rects, ctx())
		// 2 items × 2 zones each = 4 zones. Positions overlap (afterMe[i] === beforeMe[i+1]),
		// so unique positions span 0..N (3 distinct values for 2 items).
		expect(zones).toHaveLength(4)
		expect(new Set(zones.map((z) => z.position))).toEqual(new Set([0, 1, 2]))
		// Same row → all zones share roughly the same y span
		expect(zones[0].rect.y).toBe(zones[2].rect.y)
	})

	it('separates items on different rows into different tracks', () => {
		// 2x2 grid
		const rects = [
			rect('a', 0, 0, 0),
			rect('b', 1, 100, 0),
			rect('c', 2, 0, 100),
			rect('d', 3, 100, 100)
		]
		const zones = geometry.buildZones(rects, ctx())
		// 4 items × 2 zones each = 8 zones
		expect(zones).toHaveLength(8)
		// First two items are on the top row (y around 0..50), last two on bottom row (y around 50..)
		const topZones = zones.filter((z) => z.rect.y < 100)
		const bottomZones = zones.filter((z) => z.rect.y >= 100)
		expect(topZones.length).toBeGreaterThan(0)
		expect(bottomZones.length).toBeGreaterThan(0)
	})

	it('uses primary axis = X for row flow', () => {
		// Two adjacent items: "before a" zone should sit to the left, "after a" between a and b.
		const rects = [rect('a', 0, 100, 0), rect('b', 1, 200, 0)]
		const zones = geometry.buildZones(rects, ctx())
		const beforeA = zones.find((z) => z.position === 0)!
		const afterA = zones.find((z) => z.position === 1)!
		// "before" zone's x is the lesser, "after" zone's x is greater.
		expect(beforeA.rect.x).toBeLessThan(afterA.rect.x)
	})
})

describe('GridZoneGeometry — column flow', () => {
	const geometry = new GridZoneGeometry('column')

	it('emits zones along the y axis using primary = Y', () => {
		const rects = [rect('a', 0, 0, 0), rect('b', 1, 0, 100)]
		const zones = geometry.buildZones(rects, ctx())
		const beforeA = zones.find((z) => z.position === 0)!
		const afterA = zones.find((z) => z.position === 1)!
		// In column flow the primary axis is Y, so "after" zone is below "before".
		expect(beforeA.rect.y).toBeLessThan(afterA.rect.y)
	})

	it('still produces 2 zones per item', () => {
		const rects = [rect('a', 0, 0, 0), rect('b', 1, 0, 100), rect('c', 2, 0, 200)]
		const zones = geometry.buildZones(rects, ctx())
		expect(zones).toHaveLength(6)
		// Adjacent before/after zones share a position, so 3 items yield 4 unique positions (0..3).
		expect(new Set(zones.map((z) => z.position))).toEqual(new Set([0, 1, 2, 3]))
	})
})
