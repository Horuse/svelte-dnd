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

	it('overrides only the provided fields and keeps the rest default', () => {
		const resolved = resolveAnimationConfig({ dropDuration: 100, swapDuration: 500 })
		expect(resolved.dropDuration).toBe(100)
		expect(resolved.swapDuration).toBe(500)
		expect(resolved.returnDuration).toBe(DEFAULT_ANIMATION_CONFIG.returnDuration)
		expect(resolved.slotCollapseDuration).toBe(DEFAULT_ANIMATION_CONFIG.slotCollapseDuration)
	})

	it('treats 0 as an explicit value, not a falsy fallback', () => {
		const resolved = resolveAnimationConfig({ dropDuration: 0 })
		expect(resolved.dropDuration).toBe(0)
	})
})
