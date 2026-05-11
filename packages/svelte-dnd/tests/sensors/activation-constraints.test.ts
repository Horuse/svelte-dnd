import { describe, it, expect } from 'vitest'
import { Distance, Delay } from '../../src/lib/core/sensors/activation-constraints.js'
import type { ActivationState } from '../../src/lib/core/sensors/sensor.js'

function state(partial: Partial<ActivationState>): ActivationState {
	return {
		startX: 0,
		startY: 0,
		currentX: 0,
		currentY: 0,
		elapsedMs: 0,
		pointerType: 'mouse',
		...partial
	}
}

describe('Distance', () => {
	it('returns pending while distance is below the threshold', () => {
		const cond = new Distance({ value: 10 })
		expect(cond.evaluate(state({ currentX: 5 }))).toBe('pending')
	})

	it('returns satisfied once the diagonal distance reaches the threshold', () => {
		const cond = new Distance({ value: 5 })
		expect(cond.evaluate(state({ currentX: 3, currentY: 4 }))).toBe('satisfied')
	})

	it('aborts when tolerance is exceeded before the threshold is met', () => {
		const cond = new Distance({ value: 100, tolerance: 10 })
		expect(cond.evaluate(state({ currentX: 20 }))).toBe('aborted')
	})

	it('does not require a hold duration', () => {
		expect(new Distance({ value: 10 }).getRequiredDuration()).toBeNull()
	})
})

describe('Delay', () => {
	it('returns pending while elapsed time is below the threshold', () => {
		const cond = new Delay({ value: 200 })
		expect(cond.evaluate(state({ elapsedMs: 100 }))).toBe('pending')
	})

	it('returns satisfied once the elapsed time reaches the threshold', () => {
		const cond = new Delay({ value: 200 })
		expect(cond.evaluate(state({ elapsedMs: 200 }))).toBe('satisfied')
	})

	it('aborts when the pointer drifts past the tolerance during the wait', () => {
		const cond = new Delay({ value: 500, tolerance: 5 })
		expect(cond.evaluate(state({ currentX: 8, elapsedMs: 100 }))).toBe('aborted')
	})

	it('reports the configured wait as its required duration', () => {
		expect(new Delay({ value: 250 }).getRequiredDuration()).toBe(250)
	})
})
