/**
 * CSS-driven animation transition with configurable duration and easing.
 */
export type Transition = {
	/** Duration in milliseconds. */
	duration: number
	/**
	 * CSS easing string. Accepts any valid CSS timing-function value:
	 * `'ease'`, `'ease-out'`, `'linear'`, `'cubic-bezier(0.25, 0.46, 0.45, 0.94)'`, etc.
	 */
	easing?: string
}

type ResolvedTransition = Required<Transition>

/**
 * Transition with an optional debounce `delay` before it starts. Used for
 * preview show/hide where the library waits a moment after the pointer
 * enters/leaves a target before triggering the CSS reveal/collapse.
 */
export type DelayedTransition = Transition & {
	/** Milliseconds to wait before the transition begins. Default: 0. */
	delay?: number
}

type ResolvedDelayedTransition = Required<DelayedTransition>

/**
 * Shorthand: a bare number is treated as `{ duration: <n> }` keeping the
 * default easing. Pass a full `Transition` object to also set easing.
 */
export type DurationOrTransition = number | Transition

/**
 * Tuning knobs for built-in drag animations.
 *
 * Every field accepts either a plain millisecond `number` (shorthand —
 * easing stays at the library default) or a {@link Transition} object
 * `{ duration, easing }` to override both.
 */
export interface AnimationConfig {
	/**
	 * Drop preview — the placeholder that appears in the destination slot
	 * showing where the dragged item will land on release.
	 */
	preview?: {
		/**
		 * Reveal animation for the preview slot (opacity 0→1, transform scale
		 * 0.5→1). The optional `delay` debounces against pointer fly-bys —
		 * higher values prevent flicker, lower values feel more responsive.
		 * Default: `{ delay: 300, duration: 200, easing: 'ease' }`.
		 */
		show?: DelayedTransition
		/**
		 * Collapse animation for the preview slot (opacity 1→0, transform
		 * scale 1→0.5). The optional `delay` gives the user a beat to "come
		 * back" before the slot shrinks. Default:
		 * `{ delay: 200, duration: 200, easing: 'ease' }`.
		 */
		hide?: DelayedTransition
	}

	/**
	 * Items repositioning to make room for the ghost. Covers BOTH:
	 * - intra-container — siblings translate aside via `transform`.
	 * - inter-container — target container's spacer grows in `height`/`width`
	 *   to accommodate the incoming ghost.
	 *
	 * One field for both because they form a single visual effect: "items
	 * rearranging during drag". Default:
	 * `{ duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }`.
	 */
	siblingShift?: Transition

	/**
	 * Ghost auto-resize transition when crossing containers with different
	 * item dimensions — the dragged ghost morphs in size to preview the
	 * destination layout. Default: `{ duration: 150, easing: 'ease' }`.
	 */
	ghostResize?: Transition

	/**
	 * Ghost flight to a destination on a successful drop (rAF-driven).
	 * Default: `{ duration: 250, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }`.
	 */
	drop?: DurationOrTransition

	/**
	 * Ghost return flight to origin on a cancelled drop (rAF-driven,
	 * scroll-aware). Default:
	 * `{ duration: 300, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' }` (out-cubic).
	 */
	return?: DurationOrTransition

	/**
	 * Source slot collapse animation on a cross-container drop — the empty
	 * space the moved item used to occupy shrinks shut so siblings flow back.
	 * Default:
	 * `{ duration: 250, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' }` (in-out-quad).
	 */
	slotCollapse?: DurationOrTransition

	/**
	 * Default for `controller.animateLayout()` FLIP transitions. Overridable
	 * per-call via the method's `duration` / `easing` options. Default:
	 * `{ duration: 300, easing: 'ease' }`.
	 */
	layout?: DurationOrTransition

	/**
	 * Ghost flight per keyboard navigation keystroke (cancelled on each new key).
	 * Default: `{ duration: 150, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }`.
	 */
	keyboardFlight?: DurationOrTransition
}

export interface ResolvedAnimationConfig {
	preview: {
		show: ResolvedDelayedTransition
		hide: ResolvedDelayedTransition
	}
	siblingShift: ResolvedTransition
	ghostResize: ResolvedTransition
	drop: ResolvedTransition
	return: ResolvedTransition
	slotCollapse: ResolvedTransition
	layout: ResolvedTransition
	keyboardFlight: ResolvedTransition
}

export const DEFAULT_ANIMATION_CONFIG: ResolvedAnimationConfig = {
	preview: {
		show: { delay: 300, duration: 200, easing: 'ease' },
		hide: { delay: 200, duration: 200, easing: 'ease' }
	},
	siblingShift: { duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
	ghostResize: { duration: 150, easing: 'ease' },
	drop: { duration: 250, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
	return: { duration: 300, easing: 'cubic-bezier(0.33, 1, 0.68, 1)' },
	slotCollapse: { duration: 250, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
	layout: { duration: 300, easing: 'ease' },
	keyboardFlight: { duration: 150, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
}

function resolveTransition(
	partial: Transition | undefined,
	fallback: ResolvedTransition
): ResolvedTransition {
	return {
		duration: partial?.duration ?? fallback.duration,
		easing: partial?.easing ?? fallback.easing
	}
}

function resolveDelayedTransition(
	partial: DelayedTransition | undefined,
	fallback: ResolvedDelayedTransition
): ResolvedDelayedTransition {
	return {
		delay: partial?.delay ?? fallback.delay,
		duration: partial?.duration ?? fallback.duration,
		easing: partial?.easing ?? fallback.easing
	}
}

function resolveDurationOrTransition(
	val: DurationOrTransition | undefined,
	fallback: ResolvedTransition
): ResolvedTransition {
	if (val == null) return fallback
	if (typeof val === 'number') return { duration: val, easing: fallback.easing }
	return resolveTransition(val, fallback)
}

/**
 * Resolve a partial AnimationConfig against a base. Defaults to library
 * defaults when no base is supplied. Use a different base (e.g. the
 * controller's current resolved config) to apply a partial patch.
 */
export function resolveAnimationConfig(
	config?: AnimationConfig,
	base: ResolvedAnimationConfig = DEFAULT_ANIMATION_CONFIG
): ResolvedAnimationConfig {
	return {
		preview: {
			show: resolveDelayedTransition(config?.preview?.show, base.preview.show),
			hide: resolveDelayedTransition(config?.preview?.hide, base.preview.hide)
		},
		siblingShift: resolveTransition(config?.siblingShift, base.siblingShift),
		ghostResize: resolveTransition(config?.ghostResize, base.ghostResize),
		drop: resolveDurationOrTransition(config?.drop, base.drop),
		return: resolveDurationOrTransition(config?.return, base.return),
		slotCollapse: resolveDurationOrTransition(config?.slotCollapse, base.slotCollapse),
		layout: resolveDurationOrTransition(config?.layout, base.layout),
		keyboardFlight: resolveDurationOrTransition(config?.keyboardFlight, base.keyboardFlight)
	}
}
