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
		return container.querySelector(SELECTORS.placeholder(position))
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
}
