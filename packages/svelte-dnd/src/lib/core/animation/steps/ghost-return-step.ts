import type { AnimationStep } from './animation-step.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
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
		private position: number,
		private droppablesById: Map<string, Droppable>
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

			const droppable = this.droppablesById.get(this.containerId)
			const container = droppable?.element ?? null
			if (!container) {
				this.startSimpleReturn(resolve)
				return
			}

			const preview = DOMHelper.findPreview(container, this.position)
			if (preview) {
				this.handleFoundPreview(container, preview, resolve)
			} else {
				requestAnimationFrame(() => {
					if (this.cancelled) { resolve(); return }
					const retry = DOMHelper.findPreview(container!, this.position)
					if (retry) {
						this.handleFoundPreview(container!, retry, resolve)
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

	private handleFoundPreview(container: HTMLElement, preview: HTMLElement, resolve: () => void): void {
		if (DOMHelper.isElementVisibleInContainer(preview, container)) {
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
			const target = this.getCurrentSlotPosition(fallbackPos)

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

	private getCurrentSlotPosition(fallback: { x: number; y: number }): { x: number; y: number } {
		if (!this.containerId) return fallback
		const slotEl = this.getSlotWrapper()
		if (!slotEl) return fallback
		const rect = slotEl.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}

	private executeScrollSync(container: HTMLElement, resolve: () => void): void {
		const slotEl = this.getSlotWrapper()
		if (!slotEl) {
			requestAnimationFrame(() => {
				if (this.cancelled) { resolve(); return }
				const retry = this.getSlotWrapper()
				if (retry) {
					this.runScrollSync(container, retry, resolve)
				} else {
					resolve()
				}
			})
			return
		}
		this.runScrollSync(container, slotEl, resolve)
	}

	private runScrollSync(container: HTMLElement, slotWrapper: HTMLElement, resolve: () => void): void {
		this.state.setAnimating(true)
		const droppable = this.containerId ? this.droppablesById.get(this.containerId) : null
		// Grid layouts use vertical scroll sync — the ghost flies to a slot with both x/y,
		// but the scroll axis is vertical by convention.
		const rawLayout = droppable?.layout ?? 'vertical'
		const direction: 'vertical' | 'horizontal' = rawLayout === 'horizontal' ? 'horizontal' : 'vertical'
		const adapter = getDirectionAdapter(direction)
		const startScroll = adapter.getScroll(container)
		const startGhostPos = { ...this.state.transform! }
		const previewRect = slotWrapper.getBoundingClientRect()

		const expectedSize = direction === 'horizontal'
			? this.state.ghostSize?.width ?? 0
			: this.state.ghostSize?.height ?? 0

		const { targetScroll, scrollDelta } = this.scrollCalc.calculateScrollTarget({
			preview: slotWrapper,
			container,
			expectedSize,
			direction
		})

		const scrollDistance = Math.abs(scrollDelta)
		const duration = this.scrollCalc.calculateAdaptiveDuration(scrollDistance)

		const finalGhostPos = this.scrollCalc.calculateFinalGhostPosition({
			previewRect,
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
