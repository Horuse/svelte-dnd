import type { AnimationStrategy } from './animation-strategy.js'
import type { DragState } from '../../drag-state.svelte.js'
import type { DropZone } from '../../../types.js'
import { DOMHelper } from '../../dom-helper.js'

const ANIMATION_DURATION = 250
const easing = {
	outQuad: (t: number) => 1 - Math.pow(1 - t, 2)
}

export class DropAnimationStrategy implements AnimationStrategy {

	constructor(
		private state: DragState,
		private targetZone: DropZone
	) {}

	execute(onComplete?: () => void): void {
		if (!this.state.element || !this.state.transform) {
			onComplete?.()
			return
		}

		this.state.setAnimating(true)

		const startPos = { ...this.state.transform }
		const startTime = Date.now()

		const animate = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
			const easedProgress = easing.outQuad(progress)

			// Recalculate target position each frame in case container scrolls
			const targetPos = this.calculatePlaceholderPosition()

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

	private calculatePlaceholderPosition(): { x: number; y: number } {
		const container = DOMHelper.findContainer(this.targetZone.containerId)
		if (!container) {
			return this.calculateFallbackPosition()
		}

		const placeholder = DOMHelper.findPlaceholder(container, this.targetZone.position)
		if (placeholder) {
			const rect = placeholder.getBoundingClientRect()
			return { x: rect.left, y: rect.top }
		}

		const containerRect = container.getBoundingClientRect()
		return {
			x: containerRect.left,
			y: this.targetZone.rect.y
		}
	}

	private calculateFallbackPosition(): { x: number; y: number } {
		return {
			x: this.targetZone.rect.x + (this.targetZone.rect.width - (this.state.size?.width || 0)) / 2,
			y: this.targetZone.rect.y + (this.targetZone.rect.height - (this.state.size?.height || 0)) / 2
		}
	}
}
