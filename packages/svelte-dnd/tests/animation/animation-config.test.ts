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

	it('shorthand number is normalised to a Transition with default easing', () => {
		const resolved = resolveAnimationConfig({ drop: 100, layout: 500 })
		expect(resolved.drop.duration).toBe(100)
		expect(resolved.drop.easing).toBe(DEFAULT_ANIMATION_CONFIG.drop.easing)
		expect(resolved.layout.duration).toBe(500)
		expect(resolved.layout.easing).toBe(DEFAULT_ANIMATION_CONFIG.layout.easing)
		expect(resolved.return).toEqual(DEFAULT_ANIMATION_CONFIG.return)
		expect(resolved.slotCollapse).toEqual(DEFAULT_ANIMATION_CONFIG.slotCollapse)
	})

	it('object form lets you set both duration and easing', () => {
		const resolved = resolveAnimationConfig({
			drop: { duration: 400, easing: 'linear' }
		})
		expect(resolved.drop).toEqual({ duration: 400, easing: 'linear' })
	})

	it('object form keeps default easing when only duration is provided', () => {
		const resolved = resolveAnimationConfig({
			drop: { duration: 400 }
		})
		expect(resolved.drop.duration).toBe(400)
		expect(resolved.drop.easing).toBe(DEFAULT_ANIMATION_CONFIG.drop.easing)
	})

	it('treats 0 as an explicit value, not a falsy fallback', () => {
		const resolved = resolveAnimationConfig({ drop: 0 })
		expect(resolved.drop.duration).toBe(0)
	})

	it('preview.show accepts delay alongside duration / easing', () => {
		const resolved = resolveAnimationConfig({
			preview: { show: { delay: 50, duration: 300, easing: 'linear' } }
		})
		expect(resolved.preview.show).toEqual({ delay: 50, duration: 300, easing: 'linear' })
	})

	it('preview.hide.delay overrides only delay; duration and easing keep defaults', () => {
		const resolved = resolveAnimationConfig({
			preview: {
				hide: { delay: 500, duration: DEFAULT_ANIMATION_CONFIG.preview.hide.duration }
			}
		})
		expect(resolved.preview.hide.delay).toBe(500)
		expect(resolved.preview.hide.duration).toBe(DEFAULT_ANIMATION_CONFIG.preview.hide.duration)
		expect(resolved.preview.hide.easing).toBe(DEFAULT_ANIMATION_CONFIG.preview.hide.easing)
	})

	it('preview show is independent of hide', () => {
		const resolved = resolveAnimationConfig({
			preview: {
				show: { delay: 100, duration: DEFAULT_ANIMATION_CONFIG.preview.show.duration }
			}
		})
		expect(resolved.preview.show.delay).toBe(100)
		expect(resolved.preview.hide).toEqual(DEFAULT_ANIMATION_CONFIG.preview.hide)
	})

	it('deep-merges Transition fields preserving the unspecified half', () => {
		const resolved = resolveAnimationConfig({
			siblingShift: { duration: 350 }
		})
		expect(resolved.siblingShift.duration).toBe(350)
		expect(resolved.siblingShift.easing).toBe(DEFAULT_ANIMATION_CONFIG.siblingShift.easing)
	})

	it('uses a custom base when provided (partial patch on top of current state)', () => {
		const current = resolveAnimationConfig({
			drop: { duration: 999, easing: 'linear' },
			slotCollapse: 555
		})
		const patched = resolveAnimationConfig({ drop: 100 }, current)
		expect(patched.drop.duration).toBe(100)
		expect(patched.drop.easing).toBe('linear') // preserved from current base
		expect(patched.slotCollapse.duration).toBe(555)
	})
})
