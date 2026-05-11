import type { Droppable } from '../entities/droppable.svelte.js'

/**
 * Snapshot of a slot's layout geometry in container content-space.
 * Coordinates are relative to the container's scroll content, so they stay
 * valid under container scroll. Captured at drag start before any CSS transforms
 * exist, so transforms applied during drag do not feed back into calculations.
 */
export interface SlotLayoutRect {
	slotId: string
	position: number
	offsetLeft: number
	offsetTop: number
	width: number
	height: number
}

export interface LayoutSnapshot {
	containerId: string
	rects: SlotLayoutRect[]
	draggedIndex: number
}

/**
 * Capture the current layout of a droppable's slots. Must be called at drag start,
 * before any translations are applied. Uses the slot wrapper element (not the inner
 * draggable) because the wrapper never receives transforms — its rect is always
 * the true layout rect.
 */
export function captureLayoutSnapshot(
	droppable: Droppable,
	draggedId: string | null
): LayoutSnapshot {
	const container = droppable.element
	const containerRect = container.getBoundingClientRect()
	const scrollLeft = container.scrollLeft
	const scrollTop = container.scrollTop

	const slots = droppable.getSortedSlots()
	const rects: SlotLayoutRect[] = []
	let draggedIndex = -1

	for (const slot of slots) {
		const r = slot.element.getBoundingClientRect()
		rects.push({
			slotId: slot.draggable.id,
			position: slot.position,
			offsetLeft: r.left - containerRect.left + scrollLeft,
			offsetTop: r.top - containerRect.top + scrollTop,
			width: r.width,
			height: r.height
		})
		if (slot.draggable.id === draggedId) {
			draggedIndex = rects.length - 1
		}
	}

	return { containerId: droppable.id, rects, draggedIndex }
}

/**
 * Project a content-space rect back to viewport coordinates using the current
 * container rect and scroll offset. Used when building DropZones, which need
 * viewport rects for pointer-collision.
 */
export function toViewportRect(
	rect: SlotLayoutRect,
	containerRect: DOMRect,
	scrollLeft: number,
	scrollTop: number
): { x: number; y: number; width: number; height: number } {
	return {
		x: rect.offsetLeft + containerRect.left - scrollLeft,
		y: rect.offsetTop + containerRect.top - scrollTop,
		width: rect.width,
		height: rect.height
	}
}
