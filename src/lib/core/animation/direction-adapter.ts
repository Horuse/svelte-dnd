export interface DirectionAdapter {
	getScroll(container: HTMLElement): number
	setScroll(container: HTMLElement, value: number): void
	getPosition(rect: DOMRect): number
	getSize(rect: DOMRect): number
	getEndPosition(rect: DOMRect, size: number): number
}

export class VerticalDirectionAdapter implements DirectionAdapter {
	getScroll(container: HTMLElement): number {
		return container.scrollTop
	}

	setScroll(container: HTMLElement, value: number): void {
		container.scrollTop = value
	}

	getPosition(rect: DOMRect): number {
		return rect.top
	}

	getSize(rect: DOMRect): number {
		return rect.height
	}

	getEndPosition(rect: DOMRect, size: number): number {
		return rect.top + size
	}
}

export class HorizontalDirectionAdapter implements DirectionAdapter {
	getScroll(container: HTMLElement): number {
		return container.scrollLeft
	}

	setScroll(container: HTMLElement, value: number): void {
		container.scrollLeft = value
	}

	getPosition(rect: DOMRect): number {
		return rect.left
	}

	getSize(rect: DOMRect): number {
		return rect.width
	}

	getEndPosition(rect: DOMRect, size: number): number {
		return rect.left + size
	}
}

export function getDirectionAdapter(direction: 'vertical' | 'horizontal'): DirectionAdapter {
	return direction === 'horizontal'
		? new HorizontalDirectionAdapter()
		: new VerticalDirectionAdapter()
}
