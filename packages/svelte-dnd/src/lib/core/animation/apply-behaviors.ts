import type { AnimationStep } from './steps/animation-step.js'
import type { Behavior, BehaviorContext } from './behavior.js'
import type { Droppable } from '../entities/droppable.svelte.js'

/**
 * Resolves the effective behavior list for a droppable: per-strategy behaviors
 * if non-empty, otherwise the controller-level defaults. The first listed
 * behavior wraps outer-most.
 */
export function resolveBehaviors(droppable: Droppable | null, defaults: Behavior[]): Behavior[] {
	const strategyBehaviors = droppable?.strategy.behaviors
	if (strategyBehaviors && strategyBehaviors.length > 0) return strategyBehaviors
	return defaults
}

/**
 * Wraps a base animation step with every behavior that provides
 * `wrapDropAnimation`. Order matches the resolved behavior list — the first
 * listed becomes the outer-most wrapper.
 */
export function wrapWithBehaviors(
	step: AnimationStep,
	behaviors: Behavior[],
	ctx: BehaviorContext
): AnimationStep {
	let wrapped = step
	for (let i = behaviors.length - 1; i >= 0; i--) {
		const b = behaviors[i]
		if (b.wrapDropAnimation) {
			wrapped = b.wrapDropAnimation(wrapped, ctx)
		}
	}
	return wrapped
}

/**
 * Finds the slot wrapper element of the destination position inside a
 * droppable. Returns `null` for `target()` containers (no per-slot preview)
 * or when no preview entity is registered for that position yet.
 */
export function findTargetSlotWrapper(
	droppable: Droppable | null,
	position: number
): HTMLElement | null {
	if (!droppable || droppable.mode === 'target') return null
	const previewEntity = droppable.getSlotAt(position)?.preview ?? droppable.tailPreview
	const previewEl = previewEntity?.element
	if (!previewEl) return null
	return (previewEl.parentElement ?? previewEl) as HTMLElement
}
