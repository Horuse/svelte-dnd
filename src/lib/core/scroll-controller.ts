import type { DragState } from './drag-state.svelte.js'

export interface ScrollOptions {
	onZoneRefresh?: () => void
	onMouseUpdate?: (x: number, y: number) => void
}

export class ScrollController {
	private scrollIntervals = new Map<HTMLElement, number>()
	private lastMousePosition = { x: 0, y: 0 }

	constructor(
		private state: DragState,
		private options: ScrollOptions = {}
	) {}

	handleAutoScroll(mouseX: number, mouseY: number) {
		this.lastMousePosition = { x: mouseX, y: mouseY }

		const scrollableContainers = this.findScrollableContainers(mouseX, mouseY)

		this.clearInvalidIntervals(scrollableContainers)
		this.processContainers(scrollableContainers)
	}

	private clearInvalidIntervals(validContainers: HTMLElement[]) {
		for (const [container, intervalId] of this.scrollIntervals) {
			if (!validContainers.includes(container)) {
				clearInterval(intervalId)
				this.scrollIntervals.delete(container)
			}
		}
	}

	private processContainers(containers: HTMLElement[]) {
		containers.forEach((container) => {
			const scrollConfig = this.calculateScrollConfig(container)

			if (scrollConfig.shouldScroll && !this.scrollIntervals.has(container)) {
				this.startScrolling(container)
			} else if (!scrollConfig.shouldScroll && this.scrollIntervals.has(container)) {
				this.stopScrolling(container)
			}
		})
	}

	private calculateScrollConfig(container: HTMLElement) {
		const rect = container.getBoundingClientRect()
		const { x: mouseX, y: mouseY } = this.lastMousePosition
		const scrollZoneY = rect.height * 0.3
		const scrollZoneX = rect.width * 0.3

		const distanceFromTop = mouseY - rect.top
		const distanceFromBottom = rect.bottom - mouseY
		const distanceFromLeft = mouseX - rect.left
		const distanceFromRight = rect.right - mouseX

		let speedY = 0
		let directionY: 'up' | 'down' | null = null

		if (distanceFromTop < scrollZoneY && distanceFromTop > 0) {
			directionY = 'up'
			speedY = this.calculateSpeed(1 - distanceFromTop / scrollZoneY)
		} else if (distanceFromBottom < scrollZoneY && distanceFromBottom > 0) {
			directionY = 'down'
			speedY = this.calculateSpeed(1 - distanceFromBottom / scrollZoneY)
		}

		let speedX = 0
		let directionX: 'left' | 'right' | null = null

		if (distanceFromLeft < scrollZoneX && distanceFromLeft > 0) {
			directionX = 'left'
			speedX = this.calculateSpeed(1 - distanceFromLeft / scrollZoneX)
		} else if (distanceFromRight < scrollZoneX && distanceFromRight > 0) {
			directionX = 'right'
			speedX = this.calculateSpeed(1 - distanceFromRight / scrollZoneX)
		}

		return {
			shouldScroll: directionY !== null || directionX !== null,
			directionY,
			speedY,
			directionX,
			speedX
		}
	}

	private calculateSpeed(proximityRatio: number): number {
		if (proximityRatio < 0.33) {
			return 2 + proximityRatio * 3 * 6
		} else if (proximityRatio < 0.66) {
			return 8 + (proximityRatio - 0.33) * 3 * 10
		} else {
			return 18 + (proximityRatio - 0.66) * 3 * 12
		}
	}

	private startScrolling(container: HTMLElement) {
		const intervalId = setInterval(() => {
			const config = this.calculateScrollConfig(container)

			let scrolledX = false
			let scrolledY = false

			if (config.directionY === 'up' && container.scrollTop > 0) {
				scrolledY = true
			} else if (
				config.directionY === 'down' &&
				container.scrollTop < container.scrollHeight - container.clientHeight
			) {
				scrolledY = true
			}

			if (config.directionX === 'left' && container.scrollLeft > 0) {
				scrolledX = true
			} else if (
				config.directionX === 'right' &&
				container.scrollLeft < container.scrollWidth - container.clientWidth
			) {
				scrolledX = true
			}

			if (scrolledX || scrolledY) {
				container.scrollBy({
					top: scrolledY
						? config.directionY === 'up'
							? -config.speedY
							: config.speedY
						: 0,
					left: scrolledX
						? config.directionX === 'left'
							? -config.speedX
							: config.speedX
						: 0,
					behavior: 'auto'
				})
				this.scheduleRefresh()
			}
		}, 16)

		this.scrollIntervals.set(container, intervalId as unknown as number)
	}

	private stopScrolling(container: HTMLElement) {
		const intervalId = this.scrollIntervals.get(container)
		if (intervalId) {
			clearInterval(intervalId)
			this.scrollIntervals.delete(container)
		}
	}

	private scheduleRefresh() {
		setTimeout(() => {
			this.options.onZoneRefresh?.()
			this.options.onMouseUpdate?.(this.lastMousePosition.x, this.lastMousePosition.y)
		}, 10)
	}

	private findScrollableContainers(mouseX: number, mouseY: number): HTMLElement[] {
		const containers: HTMLElement[] = []
		const elementsAtPoint = document.elementsFromPoint(mouseX, mouseY)

		for (const element of elementsAtPoint) {
			if (element instanceof HTMLElement && element.hasAttribute('data-dnd-scroll')) {
				const computedStyle = window.getComputedStyle(element)
				const overflowY = computedStyle.overflowY
				const overflowX = computedStyle.overflowX

				const hasVerticalScroll =
					['auto', 'scroll', 'overlay'].includes(overflowY) &&
					element.scrollHeight > element.clientHeight

				const hasHorizontalScroll =
					['auto', 'scroll', 'overlay'].includes(overflowX) &&
					element.scrollWidth > element.clientWidth

				if (hasVerticalScroll || hasHorizontalScroll) {
					containers.push(element)
				}
			}
		}

		return containers
	}

	clearAll() {
		for (const [, intervalId] of this.scrollIntervals) {
			clearInterval(intervalId)
		}
		this.scrollIntervals.clear()
	}

	destroy() {
		this.clearAll()
	}
}
