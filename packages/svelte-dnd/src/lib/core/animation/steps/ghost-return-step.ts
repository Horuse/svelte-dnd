import type { AnimationStep } from './animation-step.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { DEFAULT_ANIMATION_CONFIG } from '../animation-config.js'
import { parseEasing } from '../easing.js'

/**
 * Animates the ghost back to the dragged item's origin position.
 *
 * The step itself is layout-agnostic — it interpolates from the current ghost
 * transform to the live origin slot rect each frame. Scroll-aware behaviour
 * (scroll the container in lockstep when the origin slot is off-screen) is
 * provided by the `scrollSync()` behavior wrapping this step.
 */
export class GhostReturnStep implements AnimationStep {
	private cancelled = false

	constructor(
		private state: DndState,
		private containerId: string | null,
		private position: number,
		private droppablesById: Map<string, Droppable>,
		private duration: number = DEFAULT_ANIMATION_CONFIG.return.duration,
		private easing: string = DEFAULT_ANIMATION_CONFIG.return.easing
	) {}

	execute(): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!this.state.element || !this.state.transform || !this.state.originalPosition) {
				resolve()
				return
			}

			const fallbackPos = { ...this.state.originalPosition }
			const startPos = { ...this.state.transform }
			this.state.setAnimating(true)
			const startTime = Date.now()
			const easeFn = parseEasing(this.easing)
			// Single exit point — every path through animate() either calls finish()
			// or rethrows after clearing setAnimating, so the flag never leaks.
			const finish = () => {
				this.state.setAnimating(false)
				resolve()
			}

			const animate = () => {
				try {
					if (this.cancelled) {
						finish()
						return
					}

					const progress = Math.min((Date.now() - startTime) / this.duration, 1)
					const eased = easeFn(progress)
					const target = this.getCurrentSlotPosition(fallbackPos)

					this.state.setTransform({
						x: startPos.x + (target.x - startPos.x) * eased,
						y: startPos.y + (target.y - startPos.y) * eased
					})

					if (progress < 1) {
						requestAnimationFrame(animate)
					} else {
						finish()
					}
				} catch (err) {
					this.state.setAnimating(false)
					reject(err)
				}
			}

			requestAnimationFrame(animate)
		})
	}

	cancel(): void {
		this.cancelled = true
	}

	private getCurrentSlotPosition(fallback: { x: number; y: number }): { x: number; y: number } {
		if (!this.containerId) return fallback
		const slotEl = this.getSlotWrapper()
		if (!slotEl) return fallback
		const rect = slotEl.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}

	/** Returns the slot wrapper element for the origin position, using entity lookup. */
	private getSlotWrapper(): HTMLElement | null {
		if (!this.containerId) return null
		const droppable = this.droppablesById.get(this.containerId)
		// Entity lookup (works for all regular slot positions)
		const slotEl = droppable?.getSlotAt(this.position)?.element
		if (slotEl) return slotEl
		// DOM fallback for tail preview or missing entity
		const container = droppable?.element
		if (!container) return null
		return DOMHelper.findPreviewSlot(container, this.position)
	}
}
