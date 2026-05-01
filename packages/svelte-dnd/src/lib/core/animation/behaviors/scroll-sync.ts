import type { Behavior } from '../behavior.js'
import type { AnimationStep } from '../steps/animation-step.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { planScrollSync } from '../scroll-sync-runner.js'
import { parseEasing } from '../easing.js'

export interface ScrollSyncOptions {
	/**
	 * Visibility ratio (0..1) below which the destination container scrolls
	 * in lockstep with the ghost flight, so the ghost stays inside the
	 * container's viewport.
	 *
	 * - `1.0` (default) — engage scroll-sync as soon as any pixel of the target slot is hidden
	 * - `0.5` — only when less than half is visible
	 * - `0` — disable (delegate fully to the wrapped step)
	 */
	threshold?: number
}

/**
 * Wraps the drop / return animation: when the destination slot is hidden
 * enough inside its scrollable container, the container scrolls together
 * with the ghost flight instead of letting the ghost fly off-screen.
 *
 * Built-in default — present in the controller's behavior list out of the box.
 *
 * @example
 * ```ts
 * sortable({
 *     layout: 'vertical',
 *     behaviors: [scrollSync({ threshold: 0.5 })]
 * })
 * ```
 */
export function scrollSync(opts: ScrollSyncOptions = {}): Behavior {
	const threshold = opts.threshold ?? 1

	return {
		name: 'scrollSync',
		wrapDropAnimation(next, ctx) {
			let cancelled = false

			return {
				execute(): Promise<void> {
					return new Promise<void>((resolve) => {
						// No target rect / disabled / fully visible → fall through to inner step.
						if (!ctx.targetEl || !ctx.container || threshold <= 0) {
							next.execute().then(resolve)
							return
						}
						const visible = DOMHelper.computeVisibleFraction(ctx.targetEl, ctx.container)
						if (visible >= threshold) {
							next.execute().then(resolve)
							return
						}

						// Replace inner flight with a scroll-synchronised one.
						ctx.state.setAnimating(true)
						const plan = planScrollSync({
							state: ctx.state,
							container: ctx.container,
							targetEl: ctx.targetEl,
							direction: ctx.direction,
							padding: ctx.padding
						})

						const startTime = Date.now()
						const easeFn = parseEasing(ctx.easing)
						const animate = () => {
							if (cancelled) {
								ctx.state.setAnimating(false)
								resolve()
								return
							}
							const progress = Math.min((Date.now() - startTime) / plan.duration, 1)
							plan.update(easeFn(progress))
							if (progress < 1) {
								requestAnimationFrame(animate)
							} else {
								plan.finalize()
								ctx.state.setAnimating(false)
								resolve()
							}
						}
						requestAnimationFrame(animate)
					})
				},
				cancel(): void {
					cancelled = true
					next.cancel?.()
				}
			} satisfies AnimationStep
		}
	}
}
