import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { DndEventEmitter } from '../dnd/dnd-event-emitter.js'
import type { ScrollController } from '../scroll/scroll-controller.js'
import type { DropResolver } from '../zones/drop-resolver.js'
import type { PreviewConfig } from '../handlers/preview-handler.svelte.js'
import type { AnimationStep } from './steps/animation-step.js'
import type { DropPreview, DndItemInfo, DndContainerInfo, DropEvent, DragEndEvent, DragOverEvent, DropCancelledEvent } from '../../types.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import { AnimationPipeline } from './steps/animation-pipeline.js'
import { GhostToTargetStep } from './steps/ghost-to-target-step.js'
import { GhostReturnStep } from './steps/ghost-return-step.js'

export class DropAnimationCoordinator {
	private currentAnimation: AnimationPipeline | null = null
	private hidePreviewTimeout: ReturnType<typeof setTimeout> | null = null
	private lastPreviewKey: string | null = null
	previewShowDelay = 300
	previewCollapseDelay = 200

	constructor(
		private state: DndState,
		private eventEmitter: DndEventEmitter,
		private scrollController: ScrollController,
		private dropResolver: DropResolver,
		private droppablesById: Map<string, Droppable> = new Map()
	) {}

	updateDropPreview(pointer: { x: number; y: number }) {
		if (!this.state.dragging) {
			this.state.setDropPreview(null)
			return
		}

		const targetZone = this.dropResolver.findZoneAt(pointer)

		if (targetZone) {
			const preview: DropPreview = {
				containerId: targetZone.containerId,
				position: targetZone.position,
				visible: true,
				draggedElementHeight: this.state.size?.height,
				draggedElementWidth: this.state.size?.width
			}
			this.state.setDropPreview(preview)

			const previewKey = `${targetZone.containerId}:${targetZone.position}`
			if (previewKey !== this.lastPreviewKey) {
				const prevKey = this.lastPreviewKey
				this.lastPreviewKey = previewKey

				const sourceId = this.state.draggedItem
				const element = this.state.element
				if (sourceId && element) {
					const itemInfo: DndItemInfo = {
						id: sourceId,
						data: this.state.draggedItemData,
						type: this.state.draggedType ?? undefined,
						element
					}
					const originContainerId = this.state.originContainerId
					const sourceDroppable = originContainerId ? this.droppablesById.get(originContainerId) : null
					const targetDroppable = this.droppablesById.get(targetZone.containerId)

					if (sourceDroppable && targetDroppable) {
						const sourceInfo: DndContainerInfo = {
							id: originContainerId!,
							droppable: sourceDroppable,
							position: this.state.originPosition
						}
						const currentInfo: DndContainerInfo = {
							id: targetZone.containerId,
							droppable: targetDroppable,
							position: targetZone.position
						}

						let previousInfo: DndContainerInfo | null = null
						if (prevKey) {
							const sepIdx = prevKey.lastIndexOf(':')
							const prevContainerId = prevKey.slice(0, sepIdx)
							const prevPosition = parseInt(prevKey.slice(sepIdx + 1))
							const prevDroppable = this.droppablesById.get(prevContainerId)
							if (prevDroppable) {
								previousInfo = { id: prevContainerId, droppable: prevDroppable, position: prevPosition }
							}
						}

						const event: DragOverEvent = {
							item: itemInfo,
							source: sourceInfo,
							current: currentInfo,
							previous: previousInfo
						}
						this.eventEmitter.notifyDragOver(event)
					}
				}
			}

			if (this.state.skipDropPreviewAnimation) {
				requestAnimationFrame(() => {
					this.state.setSkipDropPreviewAnimation(false)
				})
			}
		} else {
			const current = this.state.dropPreview
			if (current?.visible) {
				this.state.setDropPreview({ ...current, visible: false })
				if (this.hidePreviewTimeout) clearTimeout(this.hidePreviewTimeout)
				this.hidePreviewTimeout = setTimeout(() => {
					this.hidePreviewTimeout = null
					if (this.state.dropPreview && !this.state.dropPreview.visible) {
						this.state.setDropPreview(null)
					}
				}, 300)
			}
		}
	}

	performDrop(
		sourceId: string,
		sourceData: Record<string, unknown> | undefined,
		targetContainerId: string,
		position: number
	) {
		// Capture session data upfront — state.reset() clears it later
		const element = this.state.element
		const type = this.state.draggedType ?? undefined
		const originContainerId = this.state.originContainerId
		const originPosition = this.state.originPosition
		const sourceDroppable = originContainerId ? this.droppablesById.get(originContainerId) : null
		const targetDroppable = this.droppablesById.get(targetContainerId)

		const targetZone = this.state.zones.find(
			(zone) => zone.containerId === targetContainerId && zone.position === position
		)

		this.state.setPerformingDrop(true)
		if (this.scrollController.stopOnDrop) this.scrollController.clearAll()

		const isCrossContainer = targetContainerId !== originContainerId

		// Start slot collapse immediately, in parallel with the ghost flight.
		// GhostToTargetStep.calculateTargetPosition() reads live DOM positions each frame,
		// so the ghost automatically tracks the placeholder as block B moves up/left.
		const collapsePromise = isCrossContainer && element && sourceDroppable
			? this.startSlotCollapse(element, sourceDroppable, sourceId, originPosition)
			: Promise.resolve()

		const onDropComplete = async () => {
			await collapsePromise

			if (element && sourceDroppable && targetDroppable) {
				const itemInfo: DndItemInfo = { id: sourceId, data: sourceData, type, element }
				const sourceInfo: DndContainerInfo = { id: originContainerId!, droppable: sourceDroppable, position: originPosition }
				const targetInfo: DndContainerInfo = { id: targetContainerId, droppable: targetDroppable, position }
				const dropEvent: DropEvent = { item: itemInfo, source: sourceInfo, target: targetInfo }
				const dragEndEvent: DragEndEvent = { item: itemInfo, source: sourceInfo, target: targetInfo, cancelled: false }
				// Save scroll positions before DOM reorder — browser scroll anchoring
				// can shift scrollTop when content height changes after items update.
				const srcScroll = sourceDroppable.element?.scrollTop
				const tgtScroll = sourceDroppable !== targetDroppable ? targetDroppable.element?.scrollTop : undefined
				this.eventEmitter.notifyDrop(dropEvent)
				this.finalizeDragEnd(dragEndEvent)
				// Restore after Svelte flushes DOM updates (two microtasks: Svelte schedules
				// its flush as a microtask, we need to run after it completes)
				queueMicrotask(() => queueMicrotask(() => {
					if (srcScroll !== undefined && sourceDroppable.element) sourceDroppable.element.scrollTop = srcScroll
					if (tgtScroll !== undefined && targetDroppable.element) targetDroppable.element.scrollTop = tgtScroll
				}))
			} else {
				this.finalizeDragEnd(null)
			}
		}

		if (targetZone && this.state.element && this.state.transform) {
			this.animate(new GhostToTargetStep(this.state, targetZone, this.droppablesById), onDropComplete)
		} else {
			onDropComplete()
		}
	}

	endDrag(shouldAnimate = true) {
		const itemId = this.state.draggedItem
		const session = this.state.session

		// Capture session data before any async animation
		const element = this.state.element
		const type = this.state.draggedType ?? undefined
		const originContainerId = this.state.originContainerId
		const originPosition = this.state.originPosition
		const sourceDroppable = originContainerId ? this.droppablesById.get(originContainerId) : null

		let cancelledEvent: DropCancelledEvent | null = null
		let dragEndEvent: DragEndEvent | null = null

		if (itemId && element && sourceDroppable) {
			const itemInfo: DndItemInfo = { id: itemId, data: this.state.draggedItemData, type, element }
			const sourceInfo: DndContainerInfo = { id: originContainerId!, droppable: sourceDroppable, position: originPosition }
			cancelledEvent = { item: itemInfo, source: sourceInfo }
			dragEndEvent = { item: itemInfo, source: sourceInfo, target: null, cancelled: true }
		}

		if (cancelledEvent) this.eventEmitter.notifyDropCancelled(cancelledEvent)

		if (shouldAnimate && session?.originContainerId) {
			this.state.setDropPreview({
				containerId: session.originContainerId,
				position: session.originPosition,
				visible: true,
				draggedElementHeight: session.ghostSize.height,
				draggedElementWidth: session.ghostSize.width
			})
		}

		if (shouldAnimate && session) {
			requestAnimationFrame(() => {
				this.animate(
					new GhostReturnStep(this.state, this.state.originContainerId, this.state.originPosition, this.droppablesById),
					() => this.finalizeDragEnd(dragEndEvent)
				)
			})
		} else {
			this.finalizeDragEnd(dragEndEvent)
		}
	}

	setPreviewConfig(config: PreviewConfig) {
		if (config.showDelay !== undefined) this.previewShowDelay = config.showDelay
		if (config.collapseDelay !== undefined) this.previewCollapseDelay = config.collapseDelay
	}

	cancelCurrentAnimation() {
		this.currentAnimation?.cancel()
	}

	destroy() {
		this.currentAnimation?.cancel()
		if (this.hidePreviewTimeout) clearTimeout(this.hidePreviewTimeout)
	}

	// --- Private ---

	private startSlotCollapse(
		element: HTMLElement,
		sourceDroppable: Droppable,
		sourceId: string,
		originPosition: number
	): Promise<void> {
		const slotEl = element.parentElement
		if (!slotEl?.hasAttribute('data-dnd-slot')) return Promise.resolve()

		const isHorizontal = sourceDroppable.direction === 'horizontal'
		const slotSize = this.state.dragSlotSize
		const fullSize = isHorizontal ? (slotSize?.width ?? 0) : (slotSize?.height ?? 0)
		const startDim = isHorizontal ? slotEl.offsetWidth : slotEl.offsetHeight
		const computed = getComputedStyle(slotEl)
		const startMargin = isHorizontal
			? parseFloat(computed.marginRight) || 0
			: parseFloat(computed.marginBottom) || 0

		// Items below the dragged item need their transforms adjusted per-frame
		// so they appear to stay still as the DOM layout shrinks beneath them.
		const affectedDraggables = sourceDroppable.getSortedSlots()
			.filter(s => s.draggable.id !== sourceId && s.position > originPosition)
			.map(s => s.draggable.element)

		slotEl.style.overflow = 'hidden'

		// Duration matches ANIMATION_DURATION in GhostToTargetStep so both finish together.
		const duration = 250
		return new Promise<void>(resolve => {
			const startTime = performance.now()

			const tick = (now: number) => {
				const elapsed = now - startTime
				const t = Math.min(elapsed / duration, 1)
				const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
				const remaining = 1 - eased
				const collapseAmount = (startDim + startMargin) * eased

				if (isHorizontal) {
					slotEl.style.width = startDim * remaining + 'px'
					slotEl.style.marginRight = startMargin * remaining + 'px'
				} else {
					slotEl.style.height = startDim * remaining + 'px'
					slotEl.style.marginBottom = startMargin * remaining + 'px'
				}

				if (fullSize > 0 && affectedDraggables.length > 0) {
					const adj = -(fullSize - collapseAmount)
					for (const el of affectedDraggables) {
						el.style.transform = isHorizontal
							? `translate3d(${adj}px, 0, 0)`
							: `translate3d(0, ${adj}px, 0)`
					}
				}

				if (t < 1) {
					requestAnimationFrame(tick)
				} else {
					resolve()
				}
			}

			requestAnimationFrame(tick)
		})
	}

	private animate(step: AnimationStep, onComplete: () => void | Promise<void>): void {
		this.currentAnimation?.cancel()
		const pipeline = AnimationPipeline.chain(step)
		this.currentAnimation = pipeline
		pipeline.execute().then(() => {
			this.currentAnimation = null
			return onComplete()
		})
	}

	private finalizeDragEnd(dragEndEvent: DragEndEvent | null) {
		this.lastPreviewKey = null
		this.state.setSkipDropPreviewAnimation(true)
		this.scrollController.clearAll()
		this.state.reset()
		requestAnimationFrame(() => {
			this.state.setPerformingDrop(false)
		})

		if (dragEndEvent) {
			this.eventEmitter.notifyDragEnd(dragEndEvent)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}
}
