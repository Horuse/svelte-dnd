import { ScrollSyncCalculator } from './scroll-sync-calculator.js'
import { getDirectionAdapter } from './direction-adapter.js'
import type { DndState } from '../dnd/dnd-state.svelte.js'

const calc = new ScrollSyncCalculator()

export interface ScrollSyncPlan {
	/** Adaptive duration in ms, based on scroll distance. */
	duration: number
	/** Update ghost transform + container scroll for an eased progress in [0, 1]. */
	update(eased: number): void
	/** Snap to final exact scroll + transform — reads fresh target rect. */
	finalize(): void
}

/**
 * Builds an adaptive scroll-sync plan that ferries a ghost to a target element
 * inside a scrollable container. Used when the target element is off-screen:
 * the container scrolls in lockstep with the ghost flight so the ghost never
 * disappears past the container's viewport.
 *
 * Caller drives the rAF loop and supplies its own cancellation check; this
 * helper stays loop-agnostic so different animation steps can share the same
 * scroll-aware behaviour.
 */
export function planScrollSync(args: {
	state: DndState
	container: HTMLElement
	targetEl: HTMLElement
	direction: 'vertical' | 'horizontal'
	/** Extra space to keep between the target and the container edge after scrolling. Defaults to 0. */
	padding?: number
	/** When `true` (default), `finalize()` also re-reads the target rect and snaps the ghost there. */
	snapToTargetOnFinalize?: boolean
}): ScrollSyncPlan {
	const { state, container, targetEl, direction, padding = 0, snapToTargetOnFinalize = true } = args
	const adapter = getDirectionAdapter(direction)
	const startScroll = adapter.getScroll(container)
	const startGhostPos = { ...(state.transform ?? { x: 0, y: 0 }) }
	const previewRect = targetEl.getBoundingClientRect()

	const expectedSize = direction === 'horizontal'
		? state.ghostSize?.width ?? 0
		: state.ghostSize?.height ?? 0

	const { targetScroll, scrollDelta } = calc.calculateScrollTarget({
		preview: targetEl,
		container,
		expectedSize,
		direction,
		padding
	})

	const duration = calc.calculateAdaptiveDuration(Math.abs(scrollDelta))

	const finalGhostPos = calc.calculateFinalGhostPosition({
		previewRect,
		scrollDelta,
		direction
	})

	return {
		duration,
		update(eased: number) {
			adapter.setScroll(container, startScroll + scrollDelta * eased)
			state.setTransform({
				x: startGhostPos.x + (finalGhostPos.x - startGhostPos.x) * eased,
				y: startGhostPos.y + (finalGhostPos.y - startGhostPos.y) * eased
			})
		},
		finalize() {
			adapter.setScroll(container, targetScroll)
			if (snapToTargetOnFinalize) {
				const finalRect = targetEl.getBoundingClientRect()
				state.setTransform({ x: finalRect.left, y: finalRect.top })
			}
		}
	}
}
