import type { AnimationStep } from './animation-step.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { DropZone } from '../../../types.js'
import { DOMHelper } from '../../utils/dom-helper.js'

const ANIMATION_DURATION = 250
const easing = { outQuad: (t: number) => 1 - Math.pow(1 - t, 2) }

export class GhostToTargetStep implements AnimationStep {
	private cancelled = false

	constructor(private state: DndState, private targetZone: DropZone) {}

	execute(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.state.element || !this.state.transform) {
				resolve()
				return
			}

			this.state.setAnimating(true)
			const startPos = { ...this.state.transform }
			const startTime = Date.now()

			const animate = () => {
				if (this.cancelled) {
					this.state.setAnimating(false)
					resolve()
					return
				}

				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / ANIMATION_DURATION, 1)
				const easedProgress = easing.outQuad(progress)
				const targetPos = this.calculateTargetPosition()

				this.state.setTransform({
					x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
					y: startPos.y + (targetPos.y - startPos.y) * easedProgress
				})

				if (progress < 1) {
					requestAnimationFrame(animate)
				} else {
					this.state.setAnimating(false)
					resolve()
				}
			}

			requestAnimationFrame(animate)
		})
	}

	cancel(): void {
		this.cancelled = true
	}

	private calculateTargetPosition(): { x: number; y: number } {
		const container = DOMHelper.findContainer(this.targetZone.containerId)
		if (!container) return this.fallbackPosition()

		if (container.getAttribute('data-dnd-mode') === 'target') {
			const rect = container.getBoundingClientRect()
			const width = this.state.size?.width ?? 0
			const height = this.state.size?.height ?? 0
			return {
				x: rect.left + rect.width / 2 - width / 2,
				y: rect.top + rect.height / 2 - height / 2
			}
		}

		const placeholder = DOMHelper.findPlaceholder(container, this.targetZone.position)
		if (placeholder) {
			const rect = placeholder.getBoundingClientRect()
			return { x: rect.left, y: rect.top }
		}

		const containerRect = container.getBoundingClientRect()
		return { x: containerRect.left, y: this.targetZone.rect.y }
	}

	private fallbackPosition(): { x: number; y: number } {
		return {
			x: this.targetZone.rect.x + (this.targetZone.rect.width - (this.state.size?.width ?? 0)) / 2,
			y: this.targetZone.rect.y + (this.targetZone.rect.height - (this.state.size?.height ?? 0)) / 2
		}
	}
}
