import type { DropZone, DndMode } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'

export interface ContainerStrategy {
	readonly mode: DndMode
	calculateDropZones(containerId: string, container: HTMLElement, session: DragSession | null): DropZone[]
	getTranslations(containerId: string, container: HTMLElement, session: DragSession): Map<string, { x: number; y: number }>
	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep
	getReturnAnimation(session: DragSession): AnimationStep
}
