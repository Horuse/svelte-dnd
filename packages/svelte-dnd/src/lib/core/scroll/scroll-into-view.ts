import { isBrowser } from '../utils/dom-helper.js'

export interface ScrollTarget {
	container: HTMLElement
	direction: 'vertical' | 'horizontal'
}

const SCROLL_OVERFLOW_VALUES = new Set(['auto', 'scroll', 'overlay'])

function isScrollableY(el: HTMLElement, style: CSSStyleDeclaration): boolean {
	return SCROLL_OVERFLOW_VALUES.has(style.overflowY) && el.scrollHeight > el.clientHeight
}

function isScrollableX(el: HTMLElement, style: CSSStyleDeclaration): boolean {
	return SCROLL_OVERFLOW_VALUES.has(style.overflowX) && el.scrollWidth > el.clientWidth
}

function* scrollableAncestors(start: HTMLElement): Generator<HTMLElement> {
	let parent = start.parentElement
	while (parent) {
		const style = window.getComputedStyle(parent)
		if (isScrollableY(parent, style) || isScrollableX(parent, style)) {
			yield parent
		}
		parent = parent.parentElement
	}
}

/**
 * Find the nearest scrollable ancestor of `slotEl` where the slot sits outside
 * the visible band (container rect minus `padding` on each edge), and return
 * the axis that needs to scroll. Returns `null` when the slot is already fully
 * inside every scrollable ancestor.
 */
export function findScrollTarget(slotEl: HTMLElement, padding = 0): ScrollTarget | null {
	if (!isBrowser) return null

	for (const container of scrollableAncestors(slotEl)) {
		const slotRect = slotEl.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()
		const style = window.getComputedStyle(container)

		if (isScrollableY(container, style)) {
			if (
				slotRect.top < containerRect.top + padding ||
				slotRect.bottom > containerRect.bottom - padding
			) {
				return { container, direction: 'vertical' }
			}
		}

		if (isScrollableX(container, style)) {
			if (
				slotRect.left < containerRect.left + padding ||
				slotRect.right > containerRect.right - padding
			) {
				return { container, direction: 'horizontal' }
			}
		}
	}

	return null
}
