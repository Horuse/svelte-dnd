import type { Draggable } from './draggable.svelte.js'
import type { Preview } from './preview.svelte.js'
import type { Droppable } from './droppable.svelte.js'

export class Slot {
	element!: HTMLElement
	draggable!: Draggable
	preview: Preview | undefined = undefined
	droppable!: Droppable
	position: number

	constructor(position: number) {
		this.position = position
	}

	/**
	 * Replaces DOMHelper.calculateSlotSize — finds neighbors via droppable.getSlotAt()
	 * instead of DOM traversal. Preserves all 4 edge cases of the original implementation.
	 */
	getSize(): { width: number; height: number } {
		const nextSlot = this.droppable.getSlotAt(this.position + 1)
		const prevSlot = this.droppable.getSlotAt(this.position - 1)

		if (nextSlot) {
			const elementRect = this.element.getBoundingClientRect()
			const nextRect = nextSlot.element.getBoundingClientRect()
			return {
				width: nextRect.left - elementRect.left,
				height: nextRect.top - elementRect.top
			}
		} else if (prevSlot) {
			const elementRect = this.element.getBoundingClientRect()
			const prevRect = prevSlot.element.getBoundingClientRect()
			const gapH = elementRect.top - (prevRect.top + prevSlot.draggable.element.offsetHeight)
			const gapW = elementRect.left - (prevRect.left + prevSlot.draggable.element.offsetWidth)
			return {
				width: this.draggable.element.offsetWidth + Math.max(0, gapW),
				height: this.draggable.element.offsetHeight + Math.max(0, gapH)
			}
		} else {
			// No slot neighbors — use element size + CSS spacing variable.
			// Cannot rely on DOM margin because suppressSpacing may have zeroed it on the last slot.
			const slotStyles = getComputedStyle(this.element)
			const spacingY = parseFloat(slotStyles.getPropertyValue('--dnd-slot-spacing-y')) || 0
			const spacingX = parseFloat(slotStyles.getPropertyValue('--dnd-slot-spacing-x')) || 0
			return {
				width: this.draggable.element.offsetWidth + spacingX,
				height: this.draggable.element.offsetHeight + spacingY
			}
		}
	}

	getBoundingRect(): DOMRect {
		return this.element.getBoundingClientRect()
	}

	/**
	 * @attach handler — sets element, links Draggable↔Slot, registers data-dnd-drag-id.
	 * Called via {@attach slot.attachDraggable(draggable)} on the inner draggable div.
	 */
	attachDraggable(draggable: Draggable): (element: HTMLElement) => () => void {
		return (element: HTMLElement) => {
			draggable.element = element
			draggable.slot = this
			this.draggable = draggable
			return () => {
				draggable.destroy()
			}
		}
	}
}
