import { describe, it, expect } from 'vitest'
import { centerPoint } from '../../src/lib/core/collision/center-point.js'
import { cursorOver } from '../../src/lib/core/collision/cursor-over.js'
import { overlap } from '../../src/lib/core/collision/overlap.js'
import { closestCenter } from '../../src/lib/core/collision/closest-center.js'
import type { DropZone } from '../../src/lib/types.js'
import type { CollisionContext } from '../../src/lib/core/collision/collision-algorithm.js'

const zone = (
	containerId: string,
	position: number,
	x: number,
	y: number,
	w: number,
	h: number
): DropZone => ({
	containerId,
	position,
	layout: 'vertical',
	rect: { x, y, width: w, height: h }
})

const ctx = (
	zones: DropZone[],
	pointer: { x: number; y: number },
	ghost: { x: number; y: number; width: number; height: number }
): CollisionContext => ({ zones, pointer, ghost })

describe('centerPoint', () => {
	const zones = [zone('a', 0, 0, 0, 100, 50), zone('a', 1, 0, 50, 100, 50)]

	it('returns the zone whose rect contains the ghost center', () => {
		// ghost (10,10) 20x20 → center (20,20) — inside first zone
		const hit = centerPoint(ctx(zones, { x: 0, y: 0 }, { x: 10, y: 10, width: 20, height: 20 }))
		expect(hit).toBe(zones[0])
	})

	it('moves to the next zone when the center crosses the boundary', () => {
		// center at (50, 60) — inside second zone
		const hit = centerPoint(ctx(zones, { x: 0, y: 0 }, { x: 40, y: 50, width: 20, height: 20 }))
		expect(hit).toBe(zones[1])
	})

	it('returns null when no zone contains the center', () => {
		const hit = centerPoint(ctx(zones, { x: 0, y: 0 }, { x: 200, y: 200, width: 10, height: 10 }))
		expect(hit).toBeNull()
	})

	it('counts touching the right/bottom edge as inside (≤ comparison)', () => {
		// center exactly on (100, 50) — at the bottom-right corner of zones[0]
		const hit = centerPoint(ctx(zones, { x: 0, y: 0 }, { x: 90, y: 40, width: 20, height: 20 }))
		expect(hit).toBe(zones[0])
	})

	it('ignores pointer position entirely (only ghost rect matters)', () => {
		const hit = centerPoint(ctx(zones, { x: 999, y: 999 }, { x: 10, y: 10, width: 20, height: 20 }))
		expect(hit).toBe(zones[0])
	})
})

describe('cursorOver', () => {
	const zones = [zone('a', 0, 0, 0, 100, 50), zone('a', 1, 0, 50, 100, 50)]

	it('returns the zone whose rect contains the pointer', () => {
		const hit = cursorOver(ctx(zones, { x: 30, y: 20 }, { x: 0, y: 0, width: 0, height: 0 }))
		expect(hit).toBe(zones[0])
	})

	it('returns null when the pointer is outside all zones', () => {
		const hit = cursorOver(ctx(zones, { x: 200, y: 200 }, { x: 0, y: 0, width: 0, height: 0 }))
		expect(hit).toBeNull()
	})

	it('ignores ghost size entirely', () => {
		// Ghost would overlap zones[0] but cursor is in zones[1]
		const hit = cursorOver(
			ctx(zones, { x: 30, y: 80 }, { x: 0, y: 0, width: 100, height: 50 })
		)
		expect(hit).toBe(zones[1])
	})
})

describe('overlap', () => {
	const zones = [zone('a', 0, 0, 0, 100, 100)]

	it('returns the zone when the ghost overlaps any amount above the threshold', () => {
		const hit = overlap(0)(ctx(zones, { x: 0, y: 0 }, { x: 50, y: 50, width: 60, height: 60 }))
		expect(hit).toBe(zones[0])
	})

	it('returns null when the overlap is smaller than the pixel threshold on either axis', () => {
		// 5px overlap on both axes — threshold of 10 rejects
		const hit = overlap(10)(ctx(zones, { x: 0, y: 0 }, { x: 95, y: 95, width: 60, height: 60 }))
		expect(hit).toBeNull()
	})

	it('respects a percentage threshold relative to min(ghost.width, ghost.height)', () => {
		// 50% of min(40, 40) = 20px required. Ghost overlaps zone by 30px on both axes.
		const hit = overlap('50%')(
			ctx(zones, { x: 0, y: 0 }, { x: 70, y: 70, width: 40, height: 40 })
		)
		expect(hit).toBe(zones[0])
	})

	it('rejects when percentage threshold is not met on one axis', () => {
		// 50% of min(40, 40) = 20px. Ghost overlaps 25px horizontally but only 5px vertically.
		const hit = overlap('50%')(
			ctx(zones, { x: 0, y: 0 }, { x: 75, y: 95, width: 40, height: 40 })
		)
		expect(hit).toBeNull()
	})

	it('returns the first zone hit when several zones qualify', () => {
		const multi = [zone('a', 0, 0, 0, 100, 100), zone('a', 1, 0, 0, 200, 200)]
		const hit = overlap(0)(ctx(multi, { x: 0, y: 0 }, { x: 10, y: 10, width: 50, height: 50 }))
		expect(hit).toBe(multi[0])
	})

	it('returns null when there are no zones', () => {
		expect(
			overlap(0)(ctx([], { x: 0, y: 0 }, { x: 0, y: 0, width: 50, height: 50 }))
		).toBeNull()
	})
})

describe('closestCenter', () => {
	it('picks the zone whose center is nearest to the ghost center', () => {
		const zones = [
			zone('a', 0, 0, 0, 100, 100), // center 50,50
			zone('a', 1, 200, 0, 100, 100), // center 250,50
			zone('a', 2, 0, 200, 100, 100) // center 50,250
		]
		// Ghost center 60,60 → zones[0] is closest
		const hit = closestCenter(ctx(zones, { x: 0, y: 0 }, { x: 10, y: 10, width: 100, height: 100 }))
		expect(hit).toBe(zones[0])
	})

	it('returns null on an empty zone list', () => {
		const hit = closestCenter(ctx([], { x: 0, y: 0 }, { x: 0, y: 0, width: 10, height: 10 }))
		expect(hit).toBeNull()
	})

	it('breaks ties by preferring the first equidistant zone in the list', () => {
		const zones = [zone('a', 0, 0, 0, 100, 100), zone('a', 1, 200, 0, 100, 100)]
		// Ghost center 150,50 — equidistant from both
		const hit = closestCenter(
			ctx(zones, { x: 0, y: 0 }, { x: 100, y: 0, width: 100, height: 100 })
		)
		expect(hit).toBe(zones[0])
	})

	it('always returns a zone — even far ones — unlike point-in-rect algorithms', () => {
		const zones = [zone('a', 0, 1000, 1000, 50, 50)]
		const hit = closestCenter(ctx(zones, { x: 0, y: 0 }, { x: 0, y: 0, width: 10, height: 10 }))
		expect(hit).toBe(zones[0])
	})
})
