import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { AnimationStep } from './steps/animation-step.js'

/**
 * Per-droppable / per-controller pluggable hook for drop-side concerns.
 *
 * Mirrors the `modifiers` / `sensors` / `collision` plugin patterns:
 * built-in factories such as `autoScroll(...)` and `scrollSync(...)` produce
 * `Behavior` instances; custom behaviors can be authored by anyone.
 *
 * A behavior is duck-typed — implement only the hooks you care about:
 *
 * - `autoScrollConfig` — data-only hook read by `ScrollController` to drive
 *   edge-triggered auto-scroll while a drag is in progress.
 * - `wrapDropAnimation` — middleware-style hook that wraps the drop / return
 *   animation step. Behaviors are applied outer-first: the first behavior in
 *   the list becomes the outer-most wrapper.
 */
export interface Behavior {
	/** Optional debug-friendly identifier (e.g. `'autoScroll'`). */
	name?: string

	/** Auto-scroll tuning consumed by `ScrollController` while dragging. */
	autoScrollConfig?: AutoScrollConfig

	/** Wrap the inner animation step with extra behavior. Order: first listed wraps outer-most. */
	wrapDropAnimation?(next: AnimationStep, ctx: BehaviorContext): AnimationStep
}

export interface BehaviorContext {
	state: DndState
	/** Layout axis of the destination container. */
	direction: 'vertical' | 'horizontal'
	/** Slot wrapper element of the destination position, when known. */
	targetEl: HTMLElement | null
	/** Destination droppable's root element, when known. */
	container: HTMLElement | null
	/** Configured duration of the inner animation step. */
	duration: number
	/** Spacing between sibling items, used as edge padding by scroll-sync. */
	padding: number
}

export interface AutoScrollConfig {
	/** Fraction of container size that triggers scroll. Default: 0.3 */
	zoneRatio?: number
	/** Max scroll speed in px/frame at 60fps. Default: 30 */
	maxSpeed?: number
	/** Stop auto-scroll the moment the user releases. Default: false */
	stopOnDrop?: boolean
}
