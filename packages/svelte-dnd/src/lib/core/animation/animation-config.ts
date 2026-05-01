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
 * Tuning knobs for built-in drag animations.
 *
 * - JS-rAF fields (`drop`, `return`, `slotCollapse`, `layout`) accept a plain
 *   millisecond number — easing is hardcoded internally.
 * - CSS-driven fields (`preview.show/hide`, `siblingShift`, `ghostResize`)
 *   accept a {@link Transition} so you can tune both duration and easing.
 */
export interface AnimationConfig {
	/**
	 * Drop preview — the placeholder that appears in the destination slot
	 * showing where the dragged item will land on release.
	 */
	preview?: {
		/**
		 * Delay (ms) after the pointer enters a target before the preview slot
		 * fades in. Higher values prevent flicker on quick fly-bys; lower
		 * values feel more responsive. Default: 300.
		 */
		showDelay?: number
		/**
		 * Delay (ms) after the pointer leaves the target before the preview
		 * slot collapses. Higher values give the user a beat to "come back"
		 * before the slot shrinks. Default: 200.
		 */
		hideDelay?: number
		/**
		 * CSS transition when the preview slot reveals (opacity 0→1, transform
		 * scale 0.5→1). Default: `{ duration: 200, easing: 'ease' }`.
		 */
		show?: Transition
		/**
		 * CSS transition when the preview slot collapses (opacity 1→0,
		 * transform scale 1→0.5). Default: `{ duration: 200, easing: 'ease' }`.
		 */
		hide?: Transition
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
	 * Ghost flight to a destination on a successful drop (rAF-driven). Easing
	 * is hardcoded internally (out-quad). Default: 250.
	 */
	drop?: number

	/**
	 * Ghost return flight to origin on a cancelled drop (rAF-driven,
	 * scroll-aware). Easing hardcoded (out-cubic). Default: 300.
	 */
	return?: number

	/**
	 * Source slot collapse animation on a cross-container drop — the empty
	 * space the moved item used to occupy shrinks shut so siblings flow back.
	 * rAF-driven, easing hardcoded. Default: 250.
	 */
	slotCollapse?: number

	/**
	 * Default duration for `controller.animateLayout()` FLIP transitions.
	 * Overridable per-call via the method's `duration` option. Default: 300.
	 */
	layout?: number
}

export interface ResolvedAnimationConfig {
	preview: {
		showDelay: number
		hideDelay: number
		show: ResolvedTransition
		hide: ResolvedTransition
	}
	siblingShift: ResolvedTransition
	ghostResize: ResolvedTransition
	drop: number
	return: number
	slotCollapse: number
	layout: number
}

export const DEFAULT_ANIMATION_CONFIG: ResolvedAnimationConfig = {
	preview: {
		showDelay: 300,
		hideDelay: 200,
		show: { duration: 200, easing: 'ease' },
		hide: { duration: 200, easing: 'ease' }
	},
	siblingShift: { duration: 200, easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' },
	ghostResize: { duration: 150, easing: 'ease' },
	drop: 250,
	return: 300,
	slotCollapse: 250,
	layout: 300
}

function resolveTransition(partial: Transition | undefined, fallback: ResolvedTransition): ResolvedTransition {
	return {
		duration: partial?.duration ?? fallback.duration,
		easing: partial?.easing ?? fallback.easing
	}
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
			showDelay: config?.preview?.showDelay ?? base.preview.showDelay,
			hideDelay: config?.preview?.hideDelay ?? base.preview.hideDelay,
			show: resolveTransition(config?.preview?.show, base.preview.show),
			hide: resolveTransition(config?.preview?.hide, base.preview.hide)
		},
		siblingShift: resolveTransition(config?.siblingShift, base.siblingShift),
		ghostResize: resolveTransition(config?.ghostResize, base.ghostResize),
		drop: config?.drop ?? base.drop,
		return: config?.return ?? base.return,
		slotCollapse: config?.slotCollapse ?? base.slotCollapse,
		layout: config?.layout ?? base.layout
	}
}
