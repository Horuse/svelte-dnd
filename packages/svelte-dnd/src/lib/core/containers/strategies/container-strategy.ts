import type { DropZone, DndMode, DndDirection } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'

export interface StrategyBindContext {
	state: DndState
	droppablesById: Map<string, Droppable>
}

export interface ContainerStrategy {
	readonly mode: DndMode
	/**
	 * Direction hint for strategies that have a directional layout concept
	 * (sortable). Target-like strategies can omit it.
	 */
	readonly direction?: DndDirection
	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[]
	getTranslations(droppable: Droppable, session: DragSession): Map<string, { x: number; y: number }>
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
