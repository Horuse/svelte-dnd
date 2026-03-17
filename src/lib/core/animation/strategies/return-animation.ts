import type { AnimationStrategy } from './animation-strategy.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { ScrollSyncAnimationStrategy } from './scroll-sync-animation.js'

const ANIMATION_DURATION = 300
const easing = {
	outCubic: (t: number) => 1 - Math.pow(1 - t, 3)
}

export class ReturnAnimationStrategy implements AnimationStrategy {

	constructor(private state: DndState) {}

	execute(onComplete?: () => void): void {
		if (!this.canAnimate()) {
			onComplete?.()
			return
		}

		const originContainerId = this.state.originContainerId
		const originPosition = this.state.originPosition

		if (!originContainerId) {
			this.startSimpleReturnAnimation(onComplete)
			return
		}

		this.handlePlaceholderBasedReturn(originContainerId, originPosition, onComplete)
	}

	private canAnimate(): boolean {
		return !!(this.state.element && this.state.transform && this.state.originalPosition)
	}

	private handlePlaceholderBasedReturn(
		containerId: string,
		position: number,
		onComplete?: () => void
	): void {
		const container = DOMHelper.findContainer(containerId)
		if (!container) {
			this.startSimpleReturnAnimation(onComplete)
			return
		}

		const placeholder = DOMHelper.findPlaceholder(container, position)
		if (placeholder) {
			this.handleFoundPlaceholder(container, placeholder, containerId, position, onComplete)
		} else {
			this.retryPlaceholderSearch(container, containerId, position, onComplete)
		}
	}

	private handleFoundPlaceholder(
		container: HTMLElement,
		placeholder: HTMLElement,
		containerId: string,
		position: number,
		onComplete?: () => void
	): void {
		if (DOMHelper.isElementVisibleInContainer(placeholder, container)) {
			this.startSimpleReturnAnimation(onComplete)
		} else {
			// Delegate to scroll sync strategy
			const scrollSyncStrategy = new ScrollSyncAnimationStrategy(
				this.state,
				containerId,
				position
			)
			scrollSyncStrategy.execute(onComplete)
		}
	}

	private retryPlaceholderSearch(
		container: HTMLElement,
		containerId: string,
		position: number,
		onComplete?: () => void
	): void {
		// Placeholder might not be rendered yet, retry next frame
		requestAnimationFrame(() => {
			const placeholder = DOMHelper.findPlaceholder(container, position)
			if (placeholder) {
				this.handleFoundPlaceholder(container, placeholder, containerId, position, onComplete)
			} else {
				this.startSimpleReturnAnimation(onComplete)
			}
		})
	}

	private startSimpleReturnAnimation(onComplete?: () => void): void {
		const originContainerId = this.state.originContainerId
		const originPosition = this.state.originPosition
		const fallbackPos = { ...this.state.originalPosition! }
		const startPos = { ...this.state.transform! }

		this.state.setAnimating(true)

		const startTime = Date.now()

		const animate = () => {
			const progress = Math.min((Date.now() - startTime) / ANIMATION_DURATION, 1)
			const easedProgress = easing.outCubic(progress)

			const targetPos = this.getCurrentPlaceholderPosition(
				originContainerId,
				originPosition,
				fallbackPos
			)

			this.state.setTransform({
				x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
				y: startPos.y + (targetPos.y - startPos.y) * easedProgress
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.state.setAnimating(false)
				onComplete?.()
			}
		}

		requestAnimationFrame(animate)
	}

	private getCurrentPlaceholderPosition(
		containerId: string | null,
		position: number,
		fallback: { x: number; y: number }
	): { x: number; y: number } {
		if (!containerId) return fallback

		const container = DOMHelper.findContainer(containerId)
		if (!container) return fallback

		const placeholder = DOMHelper.findPlaceholder(container, position)
		if (!placeholder) return fallback

		const rect = placeholder.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}
}
