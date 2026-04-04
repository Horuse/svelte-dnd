import type { DndState } from '../dnd/dnd-state.svelte.js'

export interface ScrollConfig {
	/** Fraction of container size that acts as scroll trigger zone. Default: 0.3 */
	scrollZoneRatio?: number
	/** Maximum scroll speed in pixels per frame (at 60fps). Default: 30 */
	maxSpeed?: number
}

export interface ScrollOptions extends ScrollConfig {
	onZoneRefresh?: () => void
	onMouseUpdate?: (x: number, y: number) => void
}

export class ScrollController {
	private scrollFrames = new Map<HTMLElement, number>()
	private lastMousePosition = { x: 0, y: 0 }

	constructor(
		private state: DndState,
		private options: ScrollOptions = {}
	) {}

	handleAutoScroll(mouseX: number, mouseY: number) {
		this.lastMousePosition = { x: mouseX, y: mouseY }

		const scrollableContainers = this.findScrollableContainers(mouseX, mouseY)

		this.clearInvalidIntervals(scrollableContainers)
		this.processContainers(scrollableContainers)
	}

	private clearInvalidIntervals(validContainers: HTMLElement[]) {
		for (const [container, frameId] of this.scrollFrames) {
			if (!validContainers.includes(container)) {
				cancelAnimationFrame(frameId)
				this.scrollFrames.delete(container)
			}
		}
	}

	private processContainers(containers: HTMLElement[]) {
		containers.forEach((container) => {
			const scrollConfig = this.calculateScrollConfig(container)

			if (scrollConfig.shouldScroll && !this.scrollFrames.has(container)) {
				this.startScrolling(container)
			} else if (!scrollConfig.shouldScroll && this.scrollFrames.has(container)) {
				this.stopScrolling(container)
			}
		})
	}

	private calculateScrollConfig(container: HTMLElement) {
		const rect = container.getBoundingClientRect()
		const { x: mouseX, y: mouseY } = this.lastMousePosition
		const ratio = this.options.scrollZoneRatio ?? 0.3
		const scrollZoneY = rect.height * ratio
		const scrollZoneX = rect.width * ratio

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
		const maxSpeed = this.options.maxSpeed ?? 30
		let base: number
		if (proximityRatio < 0.33) {
			base = 2 + proximityRatio * 3 * 6
		} else if (proximityRatio < 0.66) {
			base = 8 + (proximityRatio - 0.33) * 3 * 10
		} else {
			base = 18 + (proximityRatio - 0.66) * 3 * 12
		}
		return base * (maxSpeed / 30)
	}

	private startScrolling(container: HTMLElement) {
		let lastTime = 0

		const tick = (time: number) => {
			if (!this.scrollFrames.has(container)) return

			const delta = lastTime ? time - lastTime : 16
			lastTime = time

			const config = this.calculateScrollConfig(container)

			if (!config.shouldScroll) {
				this.stopScrolling(container)
				return
			}

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
				const scale = delta / 16
				container.scrollBy({
					top: scrolledY
						? config.directionY === 'up'
							? -config.speedY * scale
							: config.speedY * scale
						: 0,
					left: scrolledX
						? config.directionX === 'left'
							? -config.speedX * scale
							: config.speedX * scale
						: 0,
					behavior: 'auto'
				})
				this.scheduleRefresh()
			}

			const frameId = requestAnimationFrame(tick)
			this.scrollFrames.set(container, frameId)
		}

		const frameId = requestAnimationFrame(tick)
		this.scrollFrames.set(container, frameId)
	}

	private stopScrolling(container: HTMLElement) {
		const frameId = this.scrollFrames.get(container)
		if (frameId) {
			cancelAnimationFrame(frameId)
			this.scrollFrames.delete(container)
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

	updateConfig(config: ScrollConfig) {
		this.options = { ...this.options, ...config }
	}

	clearAll() {
		for (const [, frameId] of this.scrollFrames) {
			cancelAnimationFrame(frameId)
		}
		this.scrollFrames.clear()
	}

	destroy() {
		this.clearAll()
	}
}
