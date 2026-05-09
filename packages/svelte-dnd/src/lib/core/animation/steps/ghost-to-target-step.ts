import type { AnimationStep } from './animation-step.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { DropZone } from '../../../types.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import { DEFAULT_ANIMATION_CONFIG } from '../animation-config.js'
import { parseEasing } from '../easing.js'

export class GhostToTargetStep implements AnimationStep {
	private cancelled = false

	constructor(
		private state: DndState,
		private targetZone: DropZone,
		private droppablesById: Map<string, Droppable>,
		private duration: number = DEFAULT_ANIMATION_CONFIG.drop.duration,
		private easing: string = DEFAULT_ANIMATION_CONFIG.drop.easing
	) {}

	execute(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.state.element || !this.state.transform) {
				resolve()
				return
			}

			this.state.setAnimating(true)
			const startPos = { ...this.state.transform }
			const startTime = Date.now()
			const easeFn = parseEasing(this.easing)

			const animate = () => {
				if (this.cancelled) {
					this.state.setAnimating(false)
					resolve()
					return
				}

				const elapsed = Date.now() - startTime
				const progress = Math.min(elapsed / this.duration, 1)
				const easedProgress = easeFn(progress)
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
		const droppable = this.droppablesById.get(this.targetZone.containerId)
		const container = droppable?.element ?? null
		if (!container) return this.fallbackPosition()

		if (droppable?.mode === 'target') {
			const rect = container.getBoundingClientRect()
			const width = this.state.ghostSize?.width ?? 0
			const height = this.state.ghostSize?.height ?? 0
			return {
				x: rect.left + rect.width / 2 - width / 2,
				y: rect.top + rect.height / 2 - height / 2
			}
		}

		const previewEntity =
			droppable?.getSlotAt(this.targetZone.position)?.preview ?? droppable?.tailPreview
		const previewEl = previewEntity?.element
		if (previewEl && previewEntity) {
			const slotWrapper = (previewEl.parentElement ?? previewEl) as HTMLElement
			const wrapperRect = slotWrapper.getBoundingClientRect()
			const isHorizontal = previewEntity.isHorizontal
			const alignEndY = previewEntity.align === 'end' && !isHorizontal
			const alignEndX = previewEntity.align === 'end' && isHorizontal
			const y = alignEndY
				? wrapperRect.bottom - (this.state.ghostSize?.height ?? 0)
				: wrapperRect.top
			const x = alignEndX
				? wrapperRect.right - (this.state.ghostSize?.width ?? 0)
				: wrapperRect.left
			return { x, y }
		}

		const containerRect = container.getBoundingClientRect()
		return { x: containerRect.left, y: this.targetZone.rect.y }
	}

	private fallbackPosition(): { x: number; y: number } {
		return {
			x:
				this.targetZone.rect.x +
				(this.targetZone.rect.width - (this.state.ghostSize?.width ?? 0)) / 2,
			y:
				this.targetZone.rect.y +
				(this.targetZone.rect.height - (this.state.ghostSize?.height ?? 0)) / 2
		}
	}
}
