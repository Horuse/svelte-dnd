import { describe, it, expect } from 'vitest'
import {
	resolveAnimationConfig,
	DEFAULT_ANIMATION_CONFIG
} from '../../src/lib/core/animation/animation-config.js'

describe('resolveAnimationConfig', () => {
	it('returns all defaults when no config is provided', () => {
		expect(resolveAnimationConfig()).toEqual(DEFAULT_ANIMATION_CONFIG)
	})

	it('returns all defaults when an empty config is provided', () => {
		expect(resolveAnimationConfig({})).toEqual(DEFAULT_ANIMATION_CONFIG)
	})

	it('overrides only the provided number fields and keeps the rest default', () => {
		const resolved = resolveAnimationConfig({ drop: 100, layout: 500 })
		expect(resolved.drop).toBe(100)
		expect(resolved.layout).toBe(500)
		expect(resolved.return).toBe(DEFAULT_ANIMATION_CONFIG.return)
		expect(resolved.slotCollapse).toBe(DEFAULT_ANIMATION_CONFIG.slotCollapse)
	})

	it('treats 0 as an explicit value, not a falsy fallback', () => {
		const resolved = resolveAnimationConfig({ drop: 0 })
		expect(resolved.drop).toBe(0)
	})

	it('deep-merges preview delays without affecting transitions', () => {
		const resolved = resolveAnimationConfig({
			preview: { showDelay: 50 }
		})
		expect(resolved.preview.showDelay).toBe(50)
		expect(resolved.preview.hideDelay).toBe(DEFAULT_ANIMATION_CONFIG.preview.hideDelay)
		expect(resolved.preview.show).toEqual(DEFAULT_ANIMATION_CONFIG.preview.show)
	})

	it('deep-merges Transition fields preserving the unspecified half', () => {
		const resolved = resolveAnimationConfig({
			siblingShift: { duration: 350 }
		})
		expect(resolved.siblingShift.duration).toBe(350)
		expect(resolved.siblingShift.easing).toBe(DEFAULT_ANIMATION_CONFIG.siblingShift.easing)
	})

	it('uses a custom base when provided (partial patch on top of current state)', () => {
		const current = resolveAnimationConfig({ drop: 999, slotCollapse: 555 })
		const patched = resolveAnimationConfig({ drop: 100 }, current)
		expect(patched.drop).toBe(100)
		expect(patched.slotCollapse).toBe(555)
	})

	it('lets explicit easing override library default', () => {
		const resolved = resolveAnimationConfig({
			preview: { show: { duration: 300, easing: 'linear' } }
		})
		expect(resolved.preview.show).toEqual({ duration: 300, easing: 'linear' })
	})
})
