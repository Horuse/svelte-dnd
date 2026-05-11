import { isBrowser } from '../utils/dom-helper.js'

export interface ScrollSlotIntoViewOptions {
	/** Pixel buffer kept between the slot and each scrollable edge after scrolling. */
	padding?: number
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

function applyScrollDelta(container: HTMLElement, dx: number, dy: number) {
	if (dx === 0 && dy === 0) return
	container.scrollBy({ left: dx, top: dy, behavior: 'instant' as ScrollBehavior })
}

/** Instantly scrolls every scrollable ancestor of `slotEl` by the minimum delta needed to keep it inside the container minus `padding`. */
export function scrollSlotIntoView(slotEl: HTMLElement, options: ScrollSlotIntoViewOptions = {}) {
	if (!isBrowser) return
	const padding = options.padding ?? 0

	for (const container of scrollableAncestors(slotEl)) {
		const slotRect = slotEl.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()
		const style = window.getComputedStyle(container)

		let dx = 0
		let dy = 0

		if (isScrollableY(container, style)) {
			const visibleTop = containerRect.top + padding
			const visibleBottom = containerRect.bottom - padding
			if (slotRect.top < visibleTop) {
				dy = slotRect.top - visibleTop
			} else if (slotRect.bottom > visibleBottom) {
				dy = slotRect.bottom - visibleBottom
			}
		}

		if (isScrollableX(container, style)) {
			const visibleLeft = containerRect.left + padding
			const visibleRight = containerRect.right - padding
			if (slotRect.left < visibleLeft) {
				dx = slotRect.left - visibleLeft
			} else if (slotRect.right > visibleRight) {
				dx = slotRect.right - visibleRight
			}
		}

		applyScrollDelta(container, dx, dy)
	}
}
