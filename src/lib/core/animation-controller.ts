import type { DragState } from './drag-state.svelte.js'
import type { DropZone } from '../types.js'

export class AnimationController {
	constructor(private state: DragState) {}

	animateReturn(onComplete?: () => void) {
		if (!this.state.element || !this.state.transform || !this.state.originalPosition) {
			onComplete?.()
			return
		}

		this.state.setAnimating(true)

		const startPos = { ...this.state.transform }
		const endPos = { ...this.state.originalPosition }
		const duration = 300
		const startTime = Date.now()

		const animate = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.min(elapsed / duration, 1)
			const easeOut = 1 - Math.pow(1 - progress, 3)

			this.state.setTransform({
				x: startPos.x + (endPos.x - startPos.x) * easeOut,
				y: startPos.y + (endPos.y - startPos.y) * easeOut
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

	animateToTarget(targetZone: DropZone, onComplete?: () => void) {
		if (!this.state.element || !this.state.transform) {
			onComplete?.()
			return
		}

		this.state.setAnimating(true)

		const startPos = { ...this.state.transform }
		const endPos = this.calculatePlaceholderPosition(targetZone)
		const duration = 250
		const startTime = Date.now()

		const animate = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.min(elapsed / duration, 1)
			const easeOut = 1 - Math.pow(1 - progress, 2)

			this.state.setTransform({
				x: startPos.x + (endPos.x - startPos.x) * easeOut,
				y: startPos.y + (endPos.y - startPos.y) * easeOut
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

	private calculatePlaceholderPosition(targetZone: DropZone): { x: number; y: number } {
		const containerElement = document.querySelector(
			`[data-drop-id="${targetZone.containerId}"]`
		) as HTMLElement
		if (!containerElement) {
			return {
				x:
					targetZone.rect.x +
					(targetZone.rect.width - (this.state.size?.width || 0)) / 2,
				y:
					targetZone.rect.y +
					(targetZone.rect.height - (this.state.size?.height || 0)) / 2
			}
		}

		const placeholderElement = containerElement.querySelector(
			'[data-dnd-preview]'
		) as HTMLElement | null

		if (placeholderElement) {
			const placeholderRect = placeholderElement.getBoundingClientRect()
			return {
				x: placeholderRect.left,
				y: placeholderRect.top
			}
		}

		const containerRect = containerElement.getBoundingClientRect()
		return {
			x: containerRect.left,
			y: targetZone.rect.y
		}
	}
}
