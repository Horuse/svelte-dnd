import type { ContainerStrategy, StrategyBindContext } from './container-strategy.js'
import type { DropZone, DndMode, DndLayout } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import type { Behavior } from '../../animation/behavior.js'
import type { SlotLayoutRect, LayoutSnapshot } from '../../zones/layout-snapshot.js'
import { captureLayoutSnapshot } from '../../zones/layout-snapshot.js'
import type { VirtualSource } from '../../zones/sortable-source.js'
import { DomSortableSource, VirtualSortableSource } from '../../zones/sortable-source.js'
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
	/**
	 * Opt into virtualized layout. When set, the strategy will not capture a
	 * one-shot DOM layout snapshot at drag start; it asks `virtual.getOffset(i)`
	 * and `virtual.getSize(i)` for any slot it needs to position.
	 *
	 * Only supported for `layout: 'vertical' | 'horizontal'` — `grid` falls back
	 * to DOM mode and ignores this option.
	 *
	 * Typical setup with [virtua](https://github.com/inokawa/virtua) (Svelte):
	 * ```svelte
	 * <DndDroppable strategy={sortable({
	 *   layout: 'vertical',
	 *   virtual: {
	 *     itemCount: () => items.length,
	 *     getOffset: (i) => vlist.getItemOffset(i),
	 *     getSize: (i) => vlist.getItemSize(i)
	 *   }
	 * })}>
	 *   <VList bind:this={vlist} data={items} ...>
	 *     {#snippet children(item, index)}
	 *       <DndDraggable id={item.id} position={index}>...</DndDraggable>
	 *     {/snippet}
	 *   </VList>
	 * </DndDroppable>
	 * ```
	 *
	 * Keep the dragged item mounted while dragging (e.g. virtua's `keepMounted`)
	 * so its slot stays in the DOM and translations stay coherent.
	 */
	virtual?: VirtualSource
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
	readonly virtual?: VirtualSource

	private state!: DndState
	private droppablesById!: Map<string, Droppable>

	constructor(options: SortableOptions = {}) {
		this.layout = options.layout ?? 'vertical'
		this.flow = options.flow ?? 'row'
		this.behaviors = options.behaviors ?? []
		this.virtual = options.virtual
	}

	bindContext(ctx: StrategyBindContext): void {
		this.state = ctx.state
		this.droppablesById = ctx.droppablesById
	}

	onSessionStart(droppable: Droppable, session: DragSession): void {
		if (this.virtual && (this.layout === 'vertical' || this.layout === 'horizontal')) {
			const isOrigin = droppable.id === session.originContainerId
			const draggedIndex = isOrigin ? session.originPosition : -1
			session.setSource(
				droppable.id,
				new VirtualSortableSource(
					droppable.id,
					draggedIndex,
					droppable,
					this.virtual,
					session.itemId
				)
			)
			return
		}
		const snapshot = captureLayoutSnapshot(droppable, session.itemId)
		session.setSource(droppable.id, new DomSortableSource(snapshot, session.itemId))
	}

	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[] {
		const containerRect = droppable.element.getBoundingClientRect()
		const scrollLeft = droppable.element.scrollLeft
		const scrollTop = droppable.element.scrollTop
		const geometry = pickGeometry(this.layout, this.flow)

		const source = session?.getSource(droppable.id)
		const ctx = {
			containerId: droppable.id,
			containerRect,
			scrollLeft,
			scrollTop,
			draggedIndex: source?.draggedIndex ?? -1
		}

		if (!source) return [geometry.buildEmptyZone(ctx)]

		const visible = source.visibleRects(ctx)
		if (visible.length === 0) return [geometry.buildEmptyZone(ctx)]
		return geometry.buildZones(visible, ctx)
	}

	getTranslations(
		droppable: Droppable,
		session: DragSession
	): Map<string, { x: number; y: number }> {
		const map = new Map<string, { x: number; y: number }>()
		const source = session.getSource(droppable.id)
		if (!source) return map

		const containerId = droppable.id
		const slotSize = session.slotSize
		const layout = this.layout

		// Grid keeps the adjacency-based shift: each item slides to the next/prev rect's
		// absolute position. Requires the full set of rects, so it only runs against a
		// DOM-backed source.
		if (layout === 'grid') {
			if (!(source instanceof DomSortableSource)) return map
			const snapshot = source.snapshot
			return this.getGridTranslations(
				snapshot.rects,
				snapshot.draggedIndex,
				session.dropPreview,
				containerId,
				session
			)
		}

		// Vertical/horizontal: every displaced item shifts by the dragged slot's own size
		// (width/height including spacing). Each mounted slot whose `position` falls in
		// the shift range moves up/down one "slot worth" — works for both DOM and virtual
		// sources, where only a subset of slots is mounted at any moment.
		const axis: 'x' | 'y' = layout === 'vertical' ? 'y' : 'x'
		const step = !slotSize ? 0 : axis === 'y' ? slotSize.height : slotSize.width
		if (step === 0) return map

		const applyShift = (slotId: string, delta: number) => {
			if (delta === 0) return
			map.set(slotId, axis === 'y' ? { x: 0, y: delta } : { x: delta, y: 0 })
		}

		const D = source.draggedIndex
		const preview = session.dropPreview
		const mounted = source.mountedSlots()

		if (!preview) {
			// No hover target: collapse the gap left by the dragged item in its origin container.
			if (containerId !== session.originContainerId || D === -1) return map
			for (const s of mounted) if (s.position > D) applyShift(s.id, -step)
			return map
		}

		if (preview.containerId === containerId) {
			const P = preview.position

			if (D === -1) {
				// Cross-container target: items at position >= P shift forward by one slot.
				for (const s of mounted) if (s.position >= P) applyShift(s.id, step)
			} else {
				// Same-container reorder. targetIdx is the full-array drop index that accounts
				// for the dragged slot still occupying its origin position.
				const targetIdx = P <= D ? P : P + 1
				if (targetIdx < D) {
					// Drag moves earlier — items in [targetIdx..D-1] make room by shifting forward.
					for (const s of mounted)
						if (s.position >= targetIdx && s.position < D) applyShift(s.id, step)
				} else if (targetIdx > D) {
					// Drag moves later — items in (D..targetIdx) fill the gap by shifting back.
					for (const s of mounted)
						if (s.position > D && s.position < targetIdx) applyShift(s.id, -step)
				}
			}
		} else if (containerId === session.originContainerId && D !== -1) {
			// Origin container when the item is hovering over a different container: collapse the gap.
			for (const s of mounted) if (s.position > D) applyShift(s.id, -step)
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
		return new GhostReturnStep(
			this.state,
			session.originContainerId,
			session.originPosition,
			this.droppablesById
		)
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

