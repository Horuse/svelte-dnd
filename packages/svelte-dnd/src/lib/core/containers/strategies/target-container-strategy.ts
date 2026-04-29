import type { ContainerStrategy, StrategyBindContext } from './container-strategy.js'
import type { DropZone, DndMode } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { GhostToTargetStep } from '../../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../../animation/steps/ghost-return-step.js'

/**
 * Target container strategy — single drop zone covering the whole container, no insert previews.
 * Useful for trash zones, boards, or any container that isn't a sorted list.
 */
export class TargetContainerStrategy implements ContainerStrategy {
	readonly mode: DndMode = 'target'

	private state!: DndState
	private droppablesById!: Map<string, Droppable>

	bindContext(ctx: StrategyBindContext): void {
		this.state = ctx.state
		this.droppablesById = ctx.droppablesById
	}

	calculateDropZones(droppable: Droppable, _session: DragSession | null): DropZone[] {
		const rect = DOMHelper.getRect(droppable.element)
		return [{
			containerId: droppable.id,
			position: 0,
			layout: 'vertical',
			rect: {
				x: rect.left,
				y: rect.top,
				width: rect.width,
				height: Math.max(rect.height, 20)
			}
		}]
	}

	// Target containers don't have sortable items — no translations needed.
	// The origin container's strategy handles gap collapse.
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

/**
 * Factory for `TargetContainerStrategy`.
 *
 * @example
 * ```svelte
 * <DndDroppable strategy={target()} />
 * ```
 */
export function target(): TargetContainerStrategy {
	return new TargetContainerStrategy()
}
