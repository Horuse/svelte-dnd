import type { ContainerStrategy, StrategyBindContext } from './container-strategy.js'
import type { DropZone, DndMode, DndLayout } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import type { Behavior } from '../../animation/behavior.js'
import type { SlotLayoutRect, LayoutSnapshot } from '../../zones/layout-snapshot.js'
import { GhostToTargetStep } from '../../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../../animation/steps/ghost-return-step.js'
import { pickGeometry } from '../../zones/geometry-registry.js'

export interface SortableOptions {
	/** Container layout for drop-zone geometry. Defaults to `'vertical'`. */
	layout?: DndLayout
	/**
	 * For `layout: 'grid'`, which axis items fill first.
	 * `'row'` (default): items fill left-to-right, wrapping to next row.
	 * `'column'`: items fill top-to-bottom, wrapping to next column.
	 */
	flow?: 'row' | 'column'
	/**
	 * Per-strategy behaviors (auto-scroll, scroll-sync, future plugins).
	 * Pass an array to replace the controller's default behaviors for this droppable.
	 * Omit (or pass an empty array) to inherit the controller defaults.
	 *
	 * @example
	 * ```ts
	 * sortable({
	 *     layout: 'vertical',
	 *     behaviors: [autoScroll({ maxSpeed: 60 }), scrollSync({ threshold: 0.5 })]
	 * })
	 * ```
	 */
	behaviors?: Behavior[]
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
	readonly layout: DndLayout
	readonly flow: 'row' | 'column'
	readonly behaviors: Behavior[]

	private state!: DndState
	private droppablesById!: Map<string, Droppable>

	constructor(options: SortableOptions = {}) {
		this.layout = options.layout ?? 'vertical'
		this.flow = options.flow ?? 'row'
		this.behaviors = options.behaviors ?? []
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
		const geometry = pickGeometry(this.layout, this.flow)

		const snapshot = session?.getSnapshot(droppable.id)
		const ctx = {
			containerId: droppable.id,
			containerRect,
			scrollLeft,
			scrollTop,
			draggedIndex: snapshot?.draggedIndex ?? -1
		}

		if (!snapshot) return [geometry.buildEmptyZone(ctx)]

		const draggedId = session!.itemId
		const visible = snapshot.rects.filter((r) => {
			if (r.slotId === draggedId) return false
			const vy = r.offsetTop + containerRect.top - scrollTop
			const vx = r.offsetLeft + containerRect.left - scrollLeft
			return (
				vy + r.height > containerRect.top &&
				vy < containerRect.bottom &&
				vx + r.width > containerRect.left &&
				vx < containerRect.right
			)
		})

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
		const layout = this.layout

		// Grid keeps the adjacency-based shift: each item slides to the next/prev rect's
		// absolute position. Works when cells have equal size; different-sized grid items
		// need a different approach that this branch doesn't handle yet.
		if (layout === 'grid') {
			return this.getGridTranslations(rects, D, preview, containerId, session)
		}

		// Vertical/horizontal: every displaced item shifts by the dragged slot's own size
		// (width/height including spacing). That keeps the stack aligned even when
		// siblings have different sizes — each neighbour just moves up/down one "slot worth".
		const axis: 'x' | 'y' = layout === 'vertical' ? 'y' : 'x'
		const step = !slotSize ? 0 : axis === 'y' ? slotSize.height : slotSize.width
		if (step === 0) return map

		const applyShift = (slotId: string, delta: number) => {
			if (delta === 0) return
			map.set(slotId, axis === 'y' ? { x: 0, y: delta } : { x: delta, y: 0 })
		}

		if (!preview) {
			// No hover target: collapse the gap left by the dragged item in its origin container.
			if (containerId !== session.originContainerId || D === -1) return map
			for (let i = D + 1; i < rects.length; i++) applyShift(rects[i].slotId, -step)
			return map
		}

		if (preview.containerId === containerId) {
			const P = preview.position

			if (D === -1) {
				// Cross-container target: items at position P..end shift forward by one slot.
				for (let i = P; i < rects.length; i++) applyShift(rects[i].slotId, step)
			} else {
				// Same-container reorder. targetIdx is the full-index drop point accounting for the dragged slot.
				const targetIdx = P <= D ? P : P + 1
				if (targetIdx < D) {
					// Drag moves earlier — items in [targetIdx..D-1] make room by shifting forward.
					for (let i = targetIdx; i < D; i++) applyShift(rects[i].slotId, step)
				} else if (targetIdx > D) {
					// Drag moves later — items in [D+1..targetIdx-1] fill the gap by shifting back.
					for (let i = D + 1; i < targetIdx; i++) applyShift(rects[i].slotId, -step)
				}
			}
		} else if (containerId === session.originContainerId && D !== -1) {
			// Origin container when the item is hovering over a different container: collapse the gap.
			for (let i = D + 1; i < rects.length; i++) applyShift(rects[i].slotId, -step)
		}

		return map
	}

	private getGridTranslations(
		rects: SlotLayoutRect[],
		D: number,
		preview: { containerId: string; position: number } | null,
		containerId: string,
		session: DragSession
	): Map<string, { x: number; y: number }> {
		const map = new Map<string, { x: number; y: number }>()
		const slotSize = session.slotSize

		const extrapolateNext = (rect: SlotLayoutRect): SlotLayoutRect | null => {
			if (!slotSize) return null
			return {
				...rect,
				offsetLeft: rect.offsetLeft + slotSize.width,
				offsetTop: rect.offsetTop
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
			if (containerId !== session.originContainerId || D === -1) return map
			for (let i = D + 1; i < rects.length; i++) shift(rects[i], rects[i - 1])
			return map
		}

		if (preview.containerId === containerId) {
			const P = preview.position
			if (D === -1) {
				for (let i = P; i < rects.length; i++) {
					const target = rects[i + 1] ?? extrapolateNext(rects[i])
					shift(rects[i], target)
				}
			} else {
				const targetIdx = P <= D ? P : P + 1
				for (let i = 0; i < rects.length; i++) {
					if (i === D) continue
					if (i < D && i >= targetIdx) shift(rects[i], rects[i + 1])
					else if (i > D && i < targetIdx) shift(rects[i], rects[i - 1])
				}
			}
		} else if (containerId === session.originContainerId && D !== -1) {
			for (let i = D + 1; i < rects.length; i++) shift(rects[i], rects[i - 1])
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
 * Factory for `SortableContainerStrategy`. Pass options to configure layout
 * and (for grid) flow axis.
 *
 * @example
 * ```svelte
 * <DndDroppable strategy={sortable({ layout: 'grid', flow: 'row' })} />
 * ```
 */
export function sortable(options?: SortableOptions): SortableContainerStrategy {
	return new SortableContainerStrategy(options)
}

// Re-export for any external consumers that previously imported the type.
export type { LayoutSnapshot }
