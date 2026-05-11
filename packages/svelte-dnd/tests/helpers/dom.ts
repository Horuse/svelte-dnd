/**
 * jsdom does not run a real layout engine, so getBoundingClientRect / offsetWidth
 * / offsetHeight return zeros. These helpers stamp deterministic geometry onto an
 * element so layout-driven code paths (Slot.getSize, DropResolver, etc.) can be
 * exercised in unit tests.
 */

export interface FakeRect {
	x: number
	y: number
	width: number
	height: number
}

export function setRect(el: HTMLElement, rect: FakeRect): void {
	const { x, y, width, height } = rect
	const domRect: DOMRect = {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON() {
			return { x, y, width, height, top: y, left: x, right: x + width, bottom: y + height }
		}
	}
	el.getBoundingClientRect = () => domRect
	Object.defineProperty(el, 'offsetWidth', { configurable: true, value: width })
	Object.defineProperty(el, 'offsetHeight', { configurable: true, value: height })
}

export function makeElement(tag = 'div'): HTMLElement {
	return document.createElement(tag)
}
