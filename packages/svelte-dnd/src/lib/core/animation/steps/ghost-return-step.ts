import type { AnimationStep } from './animation-step.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { ScrollSyncCalculator } from '../scroll-sync-calculator.js'
import { getDirectionAdapter } from '../direction-adapter.js'

const RETURN_DURATION = 300
const easing = { outCubic: (t: number) => 1 - Math.pow(1 - t, 3) }

export class GhostReturnStep implements AnimationStep {
	private cancelled = false
	private scrollCalc = new ScrollSyncCalculator()

	constructor(
		private state: DndState,
		private containerId: string | null,
		private position: number
	) {}

	execute(): Promise<void> {
		return new Promise((resolve) => {
			if (!this.state.element || !this.state.transform || !this.state.originalPosition) {
				resolve()
				return
			}

			if (!this.containerId) {
				this.startSimpleReturn(resolve)
				return
			}

			const container = DOMHelper.findContainer(this.containerId)
			if (!container) {
				this.startSimpleReturn(resolve)
				return
			}

			const placeholder = DOMHelper.findPlaceholder(container, this.position)
			if (placeholder) {
				this.handleFoundPlaceholder(container, placeholder, resolve)
			} else {
				requestAnimationFrame(() => {
					if (this.cancelled) { resolve(); return }
					const retry = DOMHelper.findPlaceholder(container!, this.position)
					if (retry) {
						this.handleFoundPlaceholder(container!, retry, resolve)
					} else {
						this.startSimpleReturn(resolve)
					}
				})
			}
		})
	}

	cancel(): void {
		this.cancelled = true
	}

	private handleFoundPlaceholder(container: HTMLElement, placeholder: HTMLElement, resolve: () => void): void {
		if (DOMHelper.isElementVisibleInContainer(placeholder, container)) {
			this.startSimpleReturn(resolve)
		} else {
			this.executeScrollSync(container, resolve)
		}
	}

	private startSimpleReturn(resolve: () => void): void {
		const fallbackPos = { ...this.state.originalPosition! }
		const startPos = { ...this.state.transform! }
		this.state.setAnimating(true)
		const startTime = Date.now()

		const animate = () => {
			if (this.cancelled) {
				this.state.setAnimating(false)
				resolve()
				return
			}

			const progress = Math.min((Date.now() - startTime) / RETURN_DURATION, 1)
			const eased = easing.outCubic(progress)
			const target = this.getCurrentPlaceholderPosition(fallbackPos)

			this.state.setTransform({
				x: startPos.x + (target.x - startPos.x) * eased,
				y: startPos.y + (target.y - startPos.y) * eased
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.state.setAnimating(false)
				resolve()
			}
		}

		requestAnimationFrame(animate)
	}

	private getCurrentPlaceholderPosition(fallback: { x: number; y: number }): { x: number; y: number } {
		if (!this.containerId) return fallback
		const container = DOMHelper.findContainer(this.containerId)
		if (!container) return fallback
		const slot = DOMHelper.findPlaceholderSlot(container, this.position)
		if (!slot) return fallback
		const rect = slot.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}

	private executeScrollSync(container: HTMLElement, resolve: () => void): void {
		const slot = DOMHelper.findPlaceholderSlot(container, this.position)
		if (!slot) {
			requestAnimationFrame(() => {
				if (this.cancelled) { resolve(); return }
				const retrySlot = DOMHelper.findPlaceholderSlot(container, this.position)
				if (retrySlot) {
					this.runScrollSync(container, retrySlot, resolve)
				} else {
					resolve()
				}
			})
			return
		}
		this.runScrollSync(container, slot, resolve)
	}

	private runScrollSync(container: HTMLElement, slotWrapper: HTMLElement, resolve: () => void): void {
		this.state.setAnimating(true)
		const direction = DOMHelper.getContainerDirection(container)
		const adapter = getDirectionAdapter(direction)
		const startScroll = adapter.getScroll(container)
		const startGhostPos = { ...this.state.transform! }
		const placeholderRect = slotWrapper.getBoundingClientRect()

		const expectedSize = direction === 'horizontal'
			? this.state.dropPreview?.draggedElementWidth || this.state.elementSize?.width || 0
			: this.state.dropPreview?.draggedElementHeight || this.state.elementSize?.height || 0

		const { targetScroll, scrollDelta } = this.scrollCalc.calculateScrollTarget({
			placeholder: slotWrapper,
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

		const startTime = Date.now()

		const animate = () => {
			if (this.cancelled) {
				this.state.setAnimating(false)
				resolve()
				return
			}

			const progress = Math.min((Date.now() - startTime) / duration, 1)
			const eased = easing.outCubic(progress)

			adapter.setScroll(container, startScroll + scrollDelta * eased)
			this.state.setTransform({
				x: startGhostPos.x + (finalGhostPos.x - startGhostPos.x) * eased,
				y: startGhostPos.y + (finalGhostPos.y - startGhostPos.y) * eased
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				adapter.setScroll(container, targetScroll)
				const finalRect = slotWrapper.getBoundingClientRect()
				this.state.setTransform({ x: finalRect.left, y: finalRect.top })
				this.state.setAnimating(false)
				resolve()
			}
		}

		requestAnimationFrame(animate)
	}
}
