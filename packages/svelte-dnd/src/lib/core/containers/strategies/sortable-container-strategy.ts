import type { ContainerStrategy, StrategyBindContext } from './container-strategy.js'
import type { DropZone, DndMode, DndDirection } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import type { SlotLayoutRect, LayoutSnapshot } from '../../zones/layout-snapshot.js'
import { GhostToTargetStep } from '../../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../../animation/steps/ghost-return-step.js'
import { pickGeometry } from '../../zones/geometry-registry.js'

export interface SortableOptions {
	/** Layout direction for drop-zone geometry. Defaults to `'vertical'`. */
	direction?: DndDirection
	/**
	 * For `direction: 'grid'`, which axis items fill first.
	 * `'row'` (default): items fill left-to-right, wrapping to next row.
	 * `'column'`: items fill top-to-bottom, wrapping to next column.
	 */
	flow?: 'row' | 'column'
}

/**
 * Sortable container strategy — position-based drop zones with insert previews.
 *
 * Layout-agnostic. Reads all geometry from a LayoutSnapshot captured at drag start
 * (transform-free), so reactive transforms during drag never feed back into
 * zone or translation calculations. Direction-specific logic lives exclusively
 * in ZoneGeometry implementations.
 */
export class SortableContainerStrategy implements ContainerStrategy {
	readonly mode: DndMode = 'sortable'
	readonly direction: DndDirection
	readonly flow: 'row' | 'column'

	private state!: DndState
	private droppablesById!: Map<string, Droppable>

	constructor(options: SortableOptions = {}) {
		this.direction = options.direction ?? 'vertical'
		this.flow = options.flow ?? 'row'
	}

	bindContext(ctx: StrategyBindContext): void {
		this.state = ctx.state
		this.droppablesById = ctx.droppablesById
	}

	onSessionStart(droppable: Droppable, session: DragSession): void {
		session.captureSnapshot(droppable)
	}

	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[] {
		const containerRect = droppable.element.getBoundingClientRect()
		const scrollLeft = droppable.element.scrollLeft
		const scrollTop = droppable.element.scrollTop
		const geometry = pickGeometry(this.direction, this.flow)

		const ctx = {
			containerId: droppable.id,
			containerRect,
			scrollLeft,
			scrollTop
		}

		const snapshot = session?.getSnapshot(droppable.id)
		if (!snapshot) return [geometry.buildEmptyZone(ctx)]

		const draggedId = session!.itemId
		const visible = snapshot.rects.filter((r) => r.slotId !== draggedId)

		if (visible.length === 0) return [geometry.buildEmptyZone(ctx)]
		return geometry.buildZones(visible, ctx)
	}

	getTranslations(droppable: Droppable, session: DragSession): Map<string, { x: number; y: number }> {
		const map = new Map<string, { x: number; y: number }>()
		const snapshot = session.getSnapshot(droppable.id)
		if (!snapshot) return map

		const preview = session.dropPreview
		const D = snapshot.draggedIndex
		const rects = snapshot.rects
		const containerId = droppable.id
		const slotSize = session.slotSize
		const direction = this.direction

		const extrapolateNext = (rect: SlotLayoutRect): SlotLayoutRect | null => {
			if (!slotSize) return null
			const axis = direction === 'vertical' ? 'y' : 'x'
			const step = axis === 'y' ? slotSize.height : slotSize.width
			return {
				...rect,
				offsetLeft: rect.offsetLeft + (axis === 'x' ? step : 0),
				offsetTop: rect.offsetTop + (axis === 'y' ? step : 0)
			}
		}

		const shift = (rect: SlotLayoutRect, target: SlotLayoutRect | null) => {
			if (!target) return
			const dx = target.offsetLeft - rect.offsetLeft
			const dy = target.offsetTop - rect.offsetTop
			if (dx === 0 && dy === 0) return
			map.set(rect.slotId, { x: dx, y: dy })
		}

		if (!preview) {
			// No hover target: collapse the gap left by the dragged item in its origin container.
			if (containerId !== session.originContainerId || D === -1) return map
			for (let i = D + 1; i < rects.length; i++) {
				shift(rects[i], rects[i - 1])
			}
			return map
		}

		if (preview.containerId === containerId) {
			const P = preview.position

			if (D === -1) {
				// Cross-container target: items at position P..end shift forward by one slot.
				for (let i = P; i < rects.length; i++) {
					const target = rects[i + 1] ?? extrapolateNext(rects[i])
					shift(rects[i], target)
				}
			} else {
				// Same-container reorder. targetIdx is the full-index drop point accounting for the dragged slot.
				const targetIdx = P <= D ? P : P + 1
				for (let i = 0; i < rects.length; i++) {
					if (i === D) continue
					if (i < D && i >= targetIdx) shift(rects[i], rects[i + 1])
					else if (i > D && i < targetIdx) shift(rects[i], rects[i - 1])
				}
			}
		} else if (containerId === session.originContainerId && D !== -1) {
			// Origin container when the item is hovering over a different container: collapse the gap.
			for (let i = D + 1; i < rects.length; i++) {
				shift(rects[i], rects[i - 1])
			}
		}

		return map
	}

	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep {
		return new GhostToTargetStep(this.state, targetZone, this.droppablesById)
	}

	getReturnAnimation(session: DragSession): AnimationStep {
		return new GhostReturnStep(this.state, session.originContainerId, session.originPosition, this.droppablesById)
	}
}

/**
 * Factory for `SortableContainerStrategy`. Pass options to configure direction
 * and (for grid) flow axis.
 *
 * @example
 * ```svelte
 * <DndDroppable strategy={sortable({ direction: 'grid', flow: 'row' })} />
 * ```
 */
export function sortable(options?: SortableOptions): SortableContainerStrategy {
	return new SortableContainerStrategy(options)
}

// Re-export for any external consumers that previously imported the type.
export type { LayoutSnapshot }
