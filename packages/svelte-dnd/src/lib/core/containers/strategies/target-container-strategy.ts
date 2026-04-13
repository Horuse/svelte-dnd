import type { ContainerStrategy } from './container-strategy.js'
import type { DropZone, DndMode } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { GhostToTargetStep } from '../../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../../animation/steps/ghost-return-step.js'

export class TargetContainerStrategy implements ContainerStrategy {
	readonly mode: DndMode = 'target'

	constructor(private state: DndState, private droppablesById: Map<string, Droppable> = new Map()) {}

	calculateDropZones(droppable: Droppable, _session: DragSession | null): DropZone[] {
		const rect = DOMHelper.getRect(droppable.element)
		return [{
			containerId: droppable.id,
			position: 0,
			direction: droppable.direction,
			rect: {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: Math.max(rect.height, 20)
			}
		}]
	}

	// Target containers don't have sortable items — no translations needed.
	// The origin container's strategy (SortableContainerStrategy) handles gap collapse.
	getTranslations(_droppable: Droppable, _session: DragSession): Map<string, { x: number; y: number }> {
		return new Map()
	}

	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep {
		return new GhostToTargetStep(this.state, targetZone, this.droppablesById)
	}

	getReturnAnimation(session: DragSession): AnimationStep {
		return new GhostReturnStep(this.state, session.originContainerId, session.originPosition, this.droppablesById)
	}
}
