import type { DropZone, DndMode } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'

export interface ContainerStrategy {
	readonly mode: DndMode
	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[]
	getTranslations(droppable: Droppable, session: DragSession): Map<string, { x: number; y: number }>
	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep
	getReturnAnimation(session: DragSession): AnimationStep
}
