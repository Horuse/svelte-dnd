import type { Droppable } from '../entities/droppable.svelte.js'
import type { SlotLayoutRect, LayoutSnapshot } from './layout-snapshot.js'
import type { ZoneGeometryContext } from './zone-geometry.js'

/**
 * Geometry source for a sortable container. Hides the difference between a
 * DOM-driven layout (every slot mounted) and a virtualized layout (only a
 * window of slots mounted at a time) behind a uniform contract.
 *
 * SortableContainerStrategy reads `visibleRects` to build drop zones and
 * `mountedSlots` to drive translation shifts; both implementations decide what
 * "visible" / "mounted" means in their world.
 */
export interface SortableSource {
	readonly containerId: string
	/** Index of the dragged item in the full source list, or -1 when the drag
	 *  came from a different container. Drives the splice-position correction. */
	readonly draggedIndex: number
	/** Rects whose viewport projection intersects the container rect, sorted by
	 *  position and excluding the dragged slot. The zone geometry consumes this. */
	visibleRects(ctx: ZoneGeometryContext): SlotLayoutRect[]
	/** Slot ids + positions for items currently animated as displaced neighbours.
	 *  Translations only ever touch mounted DOM elements. */
	mountedSlots(): { id: string; position: number }[]
}

/**
 * Source backed by a one-shot DOM snapshot taken at drag start. All rects are
 * known up front — `visibleRects` just clips the snapshot to the live viewport,
 * `mountedSlots` returns every slot in the snapshot.
 */
export class DomSortableSource implements SortableSource {
	constructor(
		readonly snapshot: LayoutSnapshot,
		private draggedId: string | null
	) {}

	get containerId(): string {
		return this.snapshot.containerId
	}

	get draggedIndex(): number {
		return this.snapshot.draggedIndex
	}

	visibleRects(ctx: ZoneGeometryContext): SlotLayoutRect[] {
		const { containerRect, scrollLeft, scrollTop } = ctx
		return this.snapshot.rects.filter((r) => {
			if (r.slotId === this.draggedId) return false
			const vy = r.offsetTop + containerRect.top - scrollTop
			const vx = r.offsetLeft + containerRect.left - scrollLeft
			return (
				vy + r.height > containerRect.top &&
				vy < containerRect.bottom &&
				vx + r.width > containerRect.left &&
				vx < containerRect.right
			)
		})
	}

	mountedSlots(): { id: string; position: number }[] {
		return this.snapshot.rects.map((r) => ({ id: r.slotId, position: r.position }))
	}
}

/**
 * User-supplied virtualization hooks. All fields are optional today — the MVP
 * only uses `itemCount` for bounds checks. `getOffset` / `getSize` are part of
 * the contract for future features (drop into not-yet-mounted gaps, virtual
 * preview rendering) and can be wired up by callers without affecting current
 * behavior.
 */
export interface VirtualSource {
	itemCount?: () => number
	getOffset?: (index: number) => number
	getSize?: (index: number) => number
}

/**
 * Source for virtualized sortable lists. Geometry is read live from each
 * mounted slot's bounding rect — that lets us work alongside any virtualizer
 * (virtua, tanstack/virtual, …) without knowing where its scroll container
 * lives, since the rect is already in viewport coordinates. Slots not mounted
 * by the virtualizer simply don't contribute zones or translations.
 */
export class VirtualSortableSource implements SortableSource {
	constructor(
		readonly containerId: string,
		readonly draggedIndex: number,
		private droppable: Droppable,
		private virtual: VirtualSource,
		private draggedId: string | null
	) {}

	visibleRects(ctx: ZoneGeometryContext): SlotLayoutRect[] {
		const { containerRect } = ctx
		const slots = this.droppable.getSortedSlots()
		const itemCount = this.virtual.itemCount?.()
		const out: SlotLayoutRect[] = []
		for (const slot of slots) {
			if (slot.draggable.id === this.draggedId) continue
			const position = slot.position
			if (itemCount !== undefined && (position < 0 || position >= itemCount)) continue
			if (!slot.element) continue
			const r = slot.element.getBoundingClientRect()
			if (
				r.bottom <= containerRect.top ||
				r.top >= containerRect.bottom ||
				r.right <= containerRect.left ||
				r.left >= containerRect.right
			) continue
			out.push({
				slotId: slot.draggable.id,
				position,
				offsetLeft: r.left - containerRect.left,
				offsetTop: r.top - containerRect.top,
				width: r.width,
				height: r.height
			})
		}
		out.sort((a, b) => a.position - b.position)
		return out
	}

	mountedSlots(): { id: string; position: number }[] {
		const out: { id: string; position: number }[] = []
		for (const slot of this.droppable.getSortedSlots()) {
			out.push({ id: slot.draggable.id, position: slot.position })
		}
		return out
	}
}

