import { describe, it, expect } from 'vitest'
import { ScrollSyncCalculator } from '../../src/lib/core/animation/scroll-sync-calculator.js'
import { setRect, makeElement, type FakeRect } from '../helpers/dom.js'
import { scrollableEl } from '../helpers/fixtures.js'

const buildContainer = (rect: FakeRect, scrollTop = 0, scrollLeft = 0) =>
	scrollableEl(rect, { left: scrollLeft, top: scrollTop })

describe('ScrollSyncCalculator.calculateAdaptiveDuration', () => {
	const calc = new ScrollSyncCalculator()

	it('clamps to the minimum duration for very short scrolls', () => {
		expect(calc.calculateAdaptiveDuration(10)).toBe(400)
	})

	it('clamps to the maximum duration for very long scrolls', () => {
		expect(calc.calculateAdaptiveDuration(100_000)).toBe(1500)
	})

	it('scales linearly with distance between the bounds', () => {
		// 1800 px/sec → 900px takes 500ms → between min(400) and max(1500), so use 500.
		expect(calc.calculateAdaptiveDuration(900)).toBe(500)
	})
})

describe('ScrollSyncCalculator.calculateScrollTarget', () => {
	const calc = new ScrollSyncCalculator()

	it('returns no scroll change when the preview is already inside the viewport (vertical)', () => {
		const container = buildContainer({ x: 0, y: 0, width: 200, height: 400 }, 50)
		const preview = makeElement()
		setRect(preview, { x: 0, y: 100, width: 100, height: 100 })

		const result = calc.calculateScrollTarget({
			preview,
			container,
			expectedSize: 100,
			direction: 'vertical'
		})
		expect(result.scrollDelta).toBe(0)
	})

	it('scrolls up when the preview sits above the viewport (vertical)', () => {
		const container = buildContainer({ x: 0, y: 100, width: 200, height: 400 }, 200)
		const preview = makeElement()
		// preview top = 50 < container top 100 → overflow = 50
		setRect(preview, { x: 0, y: 50, width: 100, height: 100 })

		const result = calc.calculateScrollTarget({
			preview,
			container,
			expectedSize: 100,
			direction: 'vertical'
		})
		expect(result.scrollDelta).toBe(-50)
		expect(result.targetScroll).toBe(150)
	})

	it('scrolls down when the preview hangs below the viewport (vertical)', () => {
		const container = buildContainer({ x: 0, y: 0, width: 200, height: 200 }, 0)
		const preview = makeElement()
		// preview bottom = 250 > container bottom 200 → overflow = 50
		setRect(preview, { x: 0, y: 150, width: 100, height: 100 })

		const result = calc.calculateScrollTarget({
			preview,
			container,
			expectedSize: 100,
			direction: 'vertical'
		})
		expect(result.scrollDelta).toBe(50)
		expect(result.targetScroll).toBe(50)
	})

	it('respects the padding option, scrolling extra to keep a gap from the edge', () => {
		const container = buildContainer({ x: 0, y: 0, width: 200, height: 200 }, 0)
		const preview = makeElement()
		// preview bottom = 200 sits exactly on the container edge — without
		// padding scrollDelta would be 0; with padding 16 we should scroll 16 more.
		setRect(preview, { x: 0, y: 100, width: 100, height: 100 })

		const result = calc.calculateScrollTarget({
			preview,
			container,
			expectedSize: 100,
			direction: 'vertical',
			padding: 16
		})
		expect(result.scrollDelta).toBe(16)
		expect(result.targetScroll).toBe(16)
	})

	it('clamps the target scroll position to zero (cannot scroll past the start)', () => {
		const container = buildContainer({ x: 0, y: 0, width: 200, height: 200 }, 30)
		const preview = makeElement()
		setRect(preview, { x: 0, y: -100, width: 100, height: 100 })

		const result = calc.calculateScrollTarget({
			preview,
			container,
			expectedSize: 100,
			direction: 'vertical'
		})
		expect(result.targetScroll).toBe(0)
	})
})

describe('ScrollSyncCalculator.calculateFinalGhostPosition', () => {
	const calc = new ScrollSyncCalculator()

	it('subtracts scrollDelta from y for vertical direction', () => {
		const result = calc.calculateFinalGhostPosition({
			previewRect: { left: 100, top: 200 } as DOMRect,
			scrollDelta: 30,
			direction: 'vertical'
		})
		expect(result).toEqual({ x: 100, y: 170 })
	})

	it('subtracts scrollDelta from x for horizontal direction', () => {
		const result = calc.calculateFinalGhostPosition({
			previewRect: { left: 100, top: 200 } as DOMRect,
			scrollDelta: 30,
			direction: 'horizontal'
		})
		expect(result).toEqual({ x: 70, y: 200 })
	})
})
