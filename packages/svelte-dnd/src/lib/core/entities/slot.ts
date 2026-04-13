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
			// No slot neighbors — check the next DOM sibling of the wrapper
			// (the always-mounted tail preview wrapper in DndDroppable) to capture gap/margin.
			const nextSibling = this.element.nextElementSibling as HTMLElement | null
			if (nextSibling) {
				const wrapperRect = this.element.getBoundingClientRect()
				const siblingRect = nextSibling.getBoundingClientRect()
				return {
					width: siblingRect.left - wrapperRect.left || this.draggable.element.offsetWidth,
					height: siblingRect.top - wrapperRect.top || this.draggable.element.offsetHeight
				}
			}
			const styles = getComputedStyle(this.draggable.element)
			return {
				width: this.draggable.element.offsetWidth + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight),
				height: this.draggable.element.offsetHeight + parseFloat(styles.marginTop) + parseFloat(styles.marginBottom)
			}
		}
	}

	getBoundingRect(): DOMRect {
		return this.element.getBoundingClientRect()
	}
}
