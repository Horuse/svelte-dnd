import type { DropZone, DndMode, DndLayout } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import type { Behavior } from '../../animation/behavior.js'

export interface StrategyBindContext {
	state: DndState
	droppablesById: Map<string, Droppable>
}

export interface ContainerStrategy {
	readonly mode: DndMode
	/**
	 * Layout hint for strategies that have a layout concept (sortable).
	 * Target-like strategies can omit it.
	 */
	readonly layout?: DndLayout
	/**
	 * Per-strategy behaviors (auto-scroll, scroll-sync, future plugins).
	 * When `undefined` or empty, the controller's default behaviors apply.
	 * When non-empty, replaces the controller defaults for this droppable.
	 */
	readonly behaviors?: Behavior[]
	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[]
	getTranslations(
		droppable: Droppable,
		session: DragSession
	): Map<string, { x: number; y: number }>
	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep
	getReturnAnimation(session: DragSession): AnimationStep
	/**
	 * Called once per strategy instance when the owning droppable is first attached
	 * to a controller. Binds controller-level state (animation coordination, etc).
	 */
	bindContext?(ctx: StrategyBindContext): void
	/**
	 * Optional hook invoked on every droppable using this strategy at drag start,
	 * before any reactive cycle runs. Use it to capture layout snapshots or any
	 * other transform-free state the strategy needs during the drag.
	 */
	onSessionStart?(droppable: Droppable, session: DragSession): void
}
