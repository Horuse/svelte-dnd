import { describe, it, expect, vi } from 'vitest'
import { parseEasing } from '../../src/lib/core/animation/easing.js'

describe('parseEasing', () => {
	it('linear is identity', () => {
		const ease = parseEasing('linear')
		expect(ease(0)).toBe(0)
		expect(ease(0.5)).toBe(0.5)
		expect(ease(1)).toBe(1)
	})

	it('endpoints are exact for any keyword', () => {
		for (const k of ['ease', 'ease-in', 'ease-out', 'ease-in-out']) {
			const ease = parseEasing(k)
			expect(ease(0)).toBeCloseTo(0, 5)
			expect(ease(1)).toBeCloseTo(1, 5)
		}
	})

	it('ease-out decelerates (mid-point above linear)', () => {
		const ease = parseEasing('ease-out')
		expect(ease(0.5)).toBeGreaterThan(0.5)
	})

	it('ease-in accelerates (mid-point below linear)', () => {
		const ease = parseEasing('ease-in')
		expect(ease(0.5)).toBeLessThan(0.5)
	})

	it('cubic-bezier(...) parses arbitrary control points', () => {
		const ease = parseEasing('cubic-bezier(0.25, 0.1, 0.25, 1)')
		expect(ease(0)).toBeCloseTo(0, 5)
		expect(ease(1)).toBeCloseTo(1, 5)
		expect(ease(0.5)).toBeGreaterThan(0)
		expect(ease(0.5)).toBeLessThan(1)
	})

	it('cubic-bezier handles whitespace and casing', () => {
		const a = parseEasing('CUBIC-BEZIER( 0.25,0.1, 0.25,  1 )')
		const b = parseEasing('cubic-bezier(0.25, 0.1, 0.25, 1)')
		expect(a(0.4)).toBeCloseTo(b(0.4), 4)
	})

	it('clamps inputs outside [0,1]', () => {
		const ease = parseEasing('ease')
		expect(ease(-1)).toBe(0)
		expect(ease(2)).toBe(1)
	})

	it('falls back to ease-out and warns on invalid input', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
		const ease = parseEasing('not-a-real-easing')
		expect(warn).toHaveBeenCalled()
		expect(ease(0)).toBe(0)
		expect(ease(1)).toBe(1)
		expect(ease(0.5)).toBeGreaterThan(0.5) // ease-out shape
		warn.mockRestore()
	})
})
