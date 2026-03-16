import type { AnimationStrategy } from './animation-strategy.js'
import type { DragState } from '../../drag-state.svelte.js'
import { DOMHelper } from '../../dom-helper.js'
import { ScrollSyncCalculator } from '../scroll-sync-calculator.js'
import { getDirectionAdapter } from '../direction-adapter.js'

const easing = {
	outCubic: (t: number) => 1 - Math.pow(1 - t, 3)
}

export class ScrollSyncAnimationStrategy implements AnimationStrategy {
	private scrollCalc = new ScrollSyncCalculator()

	constructor(
		private state: DragState,
		private containerId: string,
		private position: number
	) {}

	execute(onComplete?: () => void): void {
		const container = DOMHelper.findContainer(this.containerId)
		if (!container) {
			onComplete?.()
			return
		}

		const placeholder = DOMHelper.findPlaceholder(container, this.position)
		if (!placeholder) {
			// Retry next frame if placeholder not rendered yet
			requestAnimationFrame(() => {
				const retryPlaceholder = DOMHelper.findPlaceholder(container, this.position)
				if (retryPlaceholder) {
					this.executeScrollSync(container, retryPlaceholder, onComplete)
				} else {
					onComplete?.()
				}
			})
			return
		}

		this.executeScrollSync(container, placeholder, onComplete)
	}

	private executeScrollSync(
		container: HTMLElement,
		placeholder: HTMLElement,
		onComplete?: () => void
	): void {
		this.state.setAnimating(true)

		const direction = DOMHelper.getContainerDirection(container)
		const adapter = getDirectionAdapter(direction)

		const startScroll = adapter.getScroll(container)
		const startGhostPos = { ...this.state.transform! }
		const placeholderRect = placeholder.getBoundingClientRect()

		const expectedSize =
			direction === 'horizontal'
				? this.state.dropPreview?.draggedElementWidth || this.state.elementSize?.width || 0
				: this.state.dropPreview?.draggedElementHeight || this.state.elementSize?.height || 0

		const { targetScroll, scrollDelta } = this.scrollCalc.calculateScrollTarget({
			placeholder,
			container,
			expectedSize,
			direction
		})

		const scrollDistance = Math.abs(scrollDelta)
		const duration = this.scrollCalc.calculateAdaptiveDuration(scrollDistance)

		const finalGhostPos = this.scrollCalc.calculateFinalGhostPosition({
			placeholderRect,
			scrollDelta,
			direction
		})

		this.runScrollAnimation({
			container,
			placeholder,
			adapter,
			startScroll,
			targetScroll,
			scrollDelta,
			startGhostPos,
			finalGhostPos,
			duration,
			onComplete
		})
	}

	private runScrollAnimation(params: {
		container: HTMLElement
		placeholder: HTMLElement
		adapter: ReturnType<typeof getDirectionAdapter>
		startScroll: number
		targetScroll: number
		scrollDelta: number
		startGhostPos: { x: number; y: number }
		finalGhostPos: { x: number; y: number }
		duration: number
		onComplete?: () => void
	}): void {
		const startTime = Date.now()

		const animate = () => {
			const progress = Math.min((Date.now() - startTime) / params.duration, 1)
			const easedProgress = easing.outCubic(progress)

			params.adapter.setScroll(
				params.container,
				params.startScroll + params.scrollDelta * easedProgress
			)

			this.state.setTransform({
				x: params.startGhostPos.x + (params.finalGhostPos.x - params.startGhostPos.x) * easedProgress,
				y: params.startGhostPos.y + (params.finalGhostPos.y - params.startGhostPos.y) * easedProgress
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.finalizeScrollAnimation(params.container, params.placeholder, params.adapter, params.targetScroll, params.onComplete)
			}
		}

		requestAnimationFrame(animate)
	}

	private finalizeScrollAnimation(
		container: HTMLElement,
		placeholder: HTMLElement,
		adapter: ReturnType<typeof getDirectionAdapter>,
		targetScroll: number,
		onComplete?: () => void
	): void {
		adapter.setScroll(container, targetScroll)
		const finalRect = placeholder.getBoundingClientRect()
		this.state.setTransform({ x: finalRect.left, y: finalRect.top })
		this.state.setAnimating(false)
		onComplete?.()
	}
}
