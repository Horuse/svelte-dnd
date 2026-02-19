// DOM selectors
const SELECTORS = {
	container: (id: string) => `[data-dnd-drop-id="${id}"]`,
	placeholder: (position: number) => `[data-dnd-preview-position="${position}"]`,
	draggableItems: ':scope > [data-dnd-draggable-item]'
} as const

export class DOMHelper {
	// Container queries
	findContainer(containerId: string): HTMLElement | null {
		return document.querySelector(SELECTORS.container(containerId))
	}

	getContainerRect(containerId: string): DOMRect | null {
		const container = this.findContainer(containerId)
		return container ? container.getBoundingClientRect() : null
	}

	getContainerDirection(container: HTMLElement): 'vertical' | 'horizontal' {
		return (container.dataset.dndDirection as 'vertical' | 'horizontal') || 'vertical'
	}

	// Placeholder queries
	findPlaceholder(container: HTMLElement, position: number): HTMLElement | null {
		return container.querySelector(SELECTORS.placeholder(position))
	}

	// Draggable items queries
	findDraggableItems(container: HTMLElement): HTMLElement[] {
		return Array.from(container.querySelectorAll(SELECTORS.draggableItems))
	}

	filterItemsByContainer(items: HTMLElement[], containerElement: HTMLElement): HTMLElement[] {
		return items.filter((item) => {
			const closestDropZone = item.closest('[data-dnd-drop-id]')
			return closestDropZone === containerElement
		})
	}

	// Visibility checks
	isElementVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
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
	getRect(element: HTMLElement): DOMRect {
		return element.getBoundingClientRect()
	}
}
