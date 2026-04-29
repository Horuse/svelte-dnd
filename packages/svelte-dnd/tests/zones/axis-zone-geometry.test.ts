import { describe, it, expect } from 'vitest'
import { AxisZoneGeometry } from '../../src/lib/core/zones/geometries/axis-zone-geometry.js'
import { geometryCtx as ctx, slotRect as rect } from '../helpers/fixtures.js'

describe('AxisZoneGeometry — vertical', () => {
	const geometry = new AxisZoneGeometry('vertical')

	it('emits a single empty zone for an empty list', () => {
		const zones = geometry.buildZones([], ctx())
		expect(zones).toHaveLength(1)
		expect(zones[0].position).toBe(0)
		expect(zones[0].rect.height).toBeGreaterThanOrEqual(20)
	})

	it('emits N+1 zones for N visible items (insert before/after)', () => {
		const rects = [
			rect('a', 0, 0, 0, 200, 50),
			rect('b', 1, 0, 60, 200, 50),
			rect('c', 2, 0, 120, 200, 50)
		]
		const zones = geometry.buildZones(rects, ctx())
		expect(zones.map((z) => z.position)).toEqual([0, 1, 2, 3])
	})

	it('zone 0 spans from container top to the first item midpoint', () => {
		const rects = [rect('a', 0, 0, 0, 200, 50)]
		const [first] = geometry.buildZones(rects, ctx())
		// Item starts at y=0 and is 50 tall, so the first zone covers y=0..(half=25).
		expect(first.position).toBe(0)
		expect(first.rect.y).toBe(0)
		expect(first.rect.height).toBe(25)
	})

	it('inter-item zone spans from one midpoint to the next', () => {
		const rects = [
			rect('a', 0, 0, 0, 200, 50), // mid y=25
			rect('b', 1, 0, 60, 200, 50) // mid y=85
		]
		const zones = geometry.buildZones(rects, ctx())
		// zone position 1 (between a and b) goes from y=25 to y=85 → height 60.
		const between = zones.find((z) => z.position === 1)!
		expect(between.rect.y).toBe(25)
		expect(between.rect.height).toBe(60)
	})

	it('last zone extends to the container bottom', () => {
		const rects = [rect('a', 0, 0, 0, 200, 50)]
		const zones = geometry.buildZones(rects, ctx())
		const last = zones.find((z) => z.position === 1)!
		// container bottom = 600, last item ends at y=50, mid at 25; last zone covers from 25 down.
		expect(last.rect.y).toBe(25)
		// remaining = 600 - 25 = 575
		expect(last.rect.height).toBe(575)
	})

	it('subtracts scrollTop from offsetTop when projecting to viewport', () => {
		const rects = [rect('a', 0, 0, 100, 200, 50)] // offsetTop 100
		const zones = geometry.buildZones(rects, ctx({ scrollTop: 40 }))
		// viewport y = offsetTop - scrollTop = 60. Zone 0 covers from 0 to mid=60+25=85.
		expect(zones[0].rect.y).toBe(0)
		expect(zones[0].rect.height).toBe(85)
	})
})

describe('AxisZoneGeometry — horizontal', () => {
	const geometry = new AxisZoneGeometry('horizontal')

	it('emits zones along the x axis using container height as zone height', () => {
		const rects = [rect('a', 0, 0, 0, 80, 100), rect('b', 1, 90, 0, 80, 100)]
		const zones = geometry.buildZones(rects, ctx({
			containerRect: {
				x: 0, y: 0, left: 0, top: 0, right: 400, bottom: 100,
				width: 400, height: 100, toJSON: () => ({})
			} as DOMRect
		}))

		// 2 items → 3 zones (positions 0, 1, 2)
		expect(zones.map((z) => z.position)).toEqual([0, 1, 2])
		// Every zone should be the full container height
		for (const z of zones) {
			expect(z.rect.height).toBe(100)
		}
	})
})
