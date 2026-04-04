/**
 * Static DOM utilities for querying DnD-related elements by their data attributes.
 * Used internally by the library; exposed for advanced custom implementations.
 */

export const isBrowser = typeof window !== 'undefined'

// DOM selectors
const SELECTORS = {
	container: (id: string) => `[data-dnd-drop-id="${id}"]`,
	placeholder: (position: number) => `[data-dnd-preview-position="${position}"]`,
	draggableItems: '[data-dnd-draggable-item]',
	draggableItemsWithId: '[data-dnd-draggable-item][data-dnd-drag-id]'
} as const

export class DOMHelper {
	// Container queries
	static findContainer(containerId: string): HTMLElement | null {
		return document.querySelector(SELECTORS.container(containerId))
	}

	static getContainerRect(containerId: string): DOMRect | null {
		const container = DOMHelper.findContainer(containerId)
		return container ? container.getBoundingClientRect() : null
	}

	static getContainerDirection(container: HTMLElement): 'vertical' | 'horizontal' {
		return (container.dataset.dndDirection as 'vertical' | 'horizontal') || 'vertical'
	}

	// Placeholder queries
	static findPlaceholder(container: HTMLElement, position: number): HTMLElement | null {
		const all = container.querySelectorAll<HTMLElement>(SELECTORS.placeholder(position))
		for (const el of all) {
			if (el.closest('[data-dnd-drop-id]') === container) return el
		}
		return null
	}

	static findPlaceholderSlot(container: HTMLElement, position: number): HTMLElement | null {
		const placeholder = DOMHelper.findPlaceholder(container, position)
		if (!placeholder) return null
		return placeholder.parentElement ?? placeholder
	}

	// Draggable items queries
	static findDraggableItems(container: HTMLElement): HTMLElement[] {
		return Array.from(container.querySelectorAll(SELECTORS.draggableItems))
	}

	static findDraggableItemsInContainer(container: HTMLElement): HTMLElement[] {
		return DOMHelper.findDraggableItems(container).filter(
			(item) => item.closest('[data-dnd-drop-id]') === container
		)
	}

	static findDraggableItemsInContainerById(container: HTMLElement): HTMLElement[] {
		return Array.from(
			container.querySelectorAll<HTMLElement>(SELECTORS.draggableItemsWithId)
		).filter((item) => item.closest('[data-dnd-drop-id]') === container)
	}

	static filterItemsByContainer(items: HTMLElement[], containerElement: HTMLElement): HTMLElement[] {
		return items.filter((item) => {
			const closestDropZone = item.closest('[data-dnd-drop-id]')
			return closestDropZone === containerElement
		})
	}

	// Visibility checks
	static isElementVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
		const containerRect = container.getBoundingClientRect()
		const elementRect = element.getBoundingClientRect()

		return (
			elementRect.top >= containerRect.top &&
			elementRect.bottom <= containerRect.bottom &&
			elementRect.left >= containerRect.left &&
			elementRect.right <= containerRect.right
		)
	}

	// Rect helpers
	static getRect(element: HTMLElement): DOMRect {
		return element.getBoundingClientRect()
	}

	static calculateSlotSize(
		element: HTMLElement,
		items: HTMLElement[]
	): { width: number; height: number } {
		const position = items.indexOf(element)
		const elementRect = element.getBoundingClientRect()
		const nextItem = items[position + 1]
		const prevItem = items[position - 1]

		if (nextItem) {
			const nextRect = nextItem.getBoundingClientRect()
			return {
				width: nextRect.left - elementRect.left,
				height: nextRect.top - elementRect.top
			}
		} else if (prevItem) {
			const prevRect = prevItem.getBoundingClientRect()
			return {
				width: elementRect.left - prevRect.left,
				height: elementRect.top - prevRect.top
			}
		} else {
			// No draggable neighbors — try the next DOM sibling of the wrapper div
			// (the always-mounted tail preview wrapper in DndDroppable) to capture gap/margin.
			const wrapperEl = element.parentElement
			const nextSibling = wrapperEl?.nextElementSibling as HTMLElement | null
			if (nextSibling) {
				const wrapperRect = wrapperEl!.getBoundingClientRect()
				const siblingRect = nextSibling.getBoundingClientRect()
				return {
					width: siblingRect.left - wrapperRect.left || element.offsetWidth,
					height: siblingRect.top - wrapperRect.top || element.offsetHeight
				}
			}
			const styles = getComputedStyle(element)
			return {
				width: element.offsetWidth + parseFloat(styles.marginLeft) + parseFloat(styles.marginRight),
				height: element.offsetHeight + parseFloat(styles.marginTop) + parseFloat(styles.marginBottom)
			}
		}
	}
}
