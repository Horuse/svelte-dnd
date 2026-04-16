/**
 * Static DOM utilities for querying DnD-related elements by their data attributes.
 * Used internally by the library; exposed for advanced custom implementations.
 */

export const isBrowser = typeof window !== 'undefined'

// DOM selectors
const SELECTORS = {
	container: (id: string) => `[data-dnd-drop-id="${CSS.escape(id)}"]`,
	preview: (position: number) => `[data-dnd-preview-position="${position}"]`
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

	// Preview queries
	static findPreview(container: HTMLElement, position: number): HTMLElement | null {
		const all = container.querySelectorAll<HTMLElement>(SELECTORS.preview(position))
		for (const el of all) {
			if (el.closest('[data-dnd-drop-id]') === container) return el
		}
		return null
	}

	static findPreviewSlot(container: HTMLElement, position: number): HTMLElement | null {
		const preview = DOMHelper.findPreview(container, position)
		if (!preview) return null
		return preview.parentElement ?? preview
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
