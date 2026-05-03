import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { DndEventEmitter } from '../dnd/dnd-event-emitter.js'
import type { ScrollController } from '../scroll/scroll-controller.js'
import type { DropResolver } from '../zones/drop-resolver.js'
import type { AnimationStep } from './steps/animation-step.js'
import type { DropPreview, DndItemInfo, DndContainerInfo, DropEvent, DragEndEvent, DragOverEvent, DropCancelledEvent } from '../../types.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { ResolvedAnimationConfig } from './animation-config.js'
import type { Behavior, BehaviorContext } from './behavior.js'
import { AnimationPipeline } from './steps/animation-pipeline.js'
import { GhostToTargetStep } from './steps/ghost-to-target-step.js'
import { GhostReturnStep } from './steps/ghost-return-step.js'
import { DEFAULT_ANIMATION_CONFIG } from './animation-config.js'
import { parseEasing } from './easing.js'
import { resolveBehaviors, wrapWithBehaviors, findTargetSlotWrapper } from './apply-behaviors.js'

export class DropAnimationCoordinator {
	private currentAnimation: AnimationPipeline | null = null
	private lastPreviewKey: string | null = null

	constructor(
		private state: DndState,
		private eventEmitter: DndEventEmitter,
		private scrollController: ScrollController,
		private dropResolver: DropResolver,
		private droppablesById: Map<string, Droppable> = new Map(),
		private animation: ResolvedAnimationConfig = DEFAULT_ANIMATION_CONFIG,
		private defaultBehaviors: Behavior[] = []
	) {}

	private buildContext(droppable: Droppable | null, position: number, duration: number, easing: string): BehaviorContext {
		const layout = droppable?.layout
		return {
			state: this.state,
			direction: layout === 'horizontal' ? 'horizontal' : 'vertical',
			targetEl: findTargetSlotWrapper(droppable, position),
			container: droppable?.element ?? null,
			duration,
			easing,
			padding: droppable?.spacing ?? 0
		}
	}

	private wrap(step: AnimationStep, droppable: Droppable | null, position: number, duration: number, easing: string): AnimationStep {
		const behaviors = resolveBehaviors(droppable, this.defaultBehaviors)
		const ctx = this.buildContext(droppable, position, duration, easing)
		return wrapWithBehaviors(step, behaviors, ctx)
	}

	setDefaultBehaviors(behaviors: Behavior[]) {
		this.defaultBehaviors = behaviors
	}

	setAnimationConfig(animation: ResolvedAnimationConfig) {
		this.animation = animation
	}

	updateDropPreview(pointer: { x: number; y: number }) {
		if (!this.state.dragging) {
			this.state.setDropPreview(null)
			return
		}

		const targetZone = this.dropResolver.findZoneAt(pointer)

		if (targetZone) {
			const preview: DropPreview = {
				containerId: targetZone.containerId,
				position: targetZone.position
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
						const sourceInfo: DndContainerInfo = sourceDroppable.toContainerInfo(this.state.originPosition)
						const currentInfo: DndContainerInfo = targetDroppable.toContainerInfo(targetZone.position)

						let previousInfo: DndContainerInfo | null = null
						if (prevKey) {
							const sepIdx = prevKey.lastIndexOf(':')
							const prevContainerId = prevKey.slice(0, sepIdx)
							const prevPosition = parseInt(prevKey.slice(sepIdx + 1))
							const prevDroppable = this.droppablesById.get(prevContainerId)
							if (prevDroppable) {
								previousInfo = prevDroppable.toContainerInfo(prevPosition)
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
		} else if (this.state.dropPreview) {
			// Pointer left all zones — drop the preview immediately. The Preview entity
			// plays its own collapse animation via collapseTimer, so visual fade-out keeps working.
			this.state.setDropPreview(null)
			this.lastPreviewKey = null
		}
	}

	performDrop(
		sourceId: string,
		sourceData: Record<string, unknown> | undefined,
		targetContainerId: string,
		position: number
	) {
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

		// Smooth source-slot collapse runs in parallel with the ghost flight so
		// items below the dragged source move up smoothly while the ghost flies.
		const collapsePromise = isCrossContainer && element && sourceDroppable
			? this.startSlotCollapse(element, sourceDroppable, sourceId, originPosition)
			: Promise.resolve()

		const onDropComplete = async () => {
			await collapsePromise

			if (element && sourceDroppable && targetDroppable) {
				const itemInfo: DndItemInfo = { id: sourceId, data: sourceData, type, element }
				const sourceInfo: DndContainerInfo = sourceDroppable.toContainerInfo(originPosition)
				const targetInfo: DndContainerInfo = targetDroppable.toContainerInfo(position)
				const dropEvent: DropEvent = { item: itemInfo, source: sourceInfo, target: targetInfo }
				const dragEndEvent: DragEndEvent = { item: itemInfo, source: sourceInfo, target: targetInfo, cancelled: false }

				// Save scroll positions before DOM reorder — browser scroll anchoring
				// can shift scrollTop when content height changes after items update.
				// Skip for virtualized containers entirely: they manage their own
				// scroll state and any extra write fights their reconciliation.
				const srcScrollTarget = !sourceDroppable.isVirtualized ? sourceDroppable.element : undefined
				const tgtScrollTarget = (sourceDroppable !== targetDroppable && !targetDroppable.isVirtualized)
					? targetDroppable.element
					: undefined
				const srcScroll = srcScrollTarget?.scrollTop
				const tgtScroll = tgtScrollTarget?.scrollTop

				this.eventEmitter.notifyDrop(dropEvent)
				this.finalizeDragEnd(dragEndEvent)

				queueMicrotask(() => queueMicrotask(() => {
					if (srcScroll !== undefined && srcScrollTarget) srcScrollTarget.scrollTop = srcScroll
					if (tgtScroll !== undefined && tgtScrollTarget) tgtScrollTarget.scrollTop = tgtScroll
				}))
			} else {
				this.finalizeDragEnd(null)
			}
		}

		if (targetZone && this.state.element && this.state.transform) {
			const baseStep = new GhostToTargetStep(this.state, targetZone, this.droppablesById, this.animation.drop.duration, this.animation.drop.easing)
			const wrapped = this.wrap(baseStep, targetDroppable ?? null, position, this.animation.drop.duration, this.animation.drop.easing)
			this.animate(wrapped, onDropComplete)
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
			const sourceInfo: DndContainerInfo = sourceDroppable.toContainerInfo(originPosition)
			cancelledEvent = { item: itemInfo, source: sourceInfo }
			dragEndEvent = { item: itemInfo, source: sourceInfo, target: null, cancelled: true }
		}

		if (cancelledEvent) this.eventEmitter.notifyDropCancelled(cancelledEvent)

		if (shouldAnimate && session?.originContainerId) {
			this.state.setDropPreview({
				containerId: session.originContainerId,
				position: session.originPosition
			})
		}

		if (shouldAnimate && session) {
			requestAnimationFrame(() => {
				const originId = this.state.originContainerId
				const originPos = this.state.originPosition
				const originDroppable = originId ? this.droppablesById.get(originId) ?? null : null
				const baseStep = new GhostReturnStep(this.state, originId, originPos, this.droppablesById, this.animation.return.duration, this.animation.return.easing)
				const wrapped = this.wrap(baseStep, originDroppable, originPos, this.animation.return.duration, this.animation.return.easing)
				this.animate(wrapped, () => this.finalizeDragEnd(dragEndEvent))
			})
		} else {
			this.finalizeDragEnd(dragEndEvent)
		}
	}

	cancelCurrentAnimation() {
		this.currentAnimation?.cancel()
	}

	destroy() {
		this.currentAnimation?.cancel()
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

		const isHorizontal = sourceDroppable.layout === 'horizontal'
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

		// `flex-shrink: 0` blocks the flex container from collapsing the slot itself
		// when `overflow: hidden` (next line) drops min-height/width to 0. Without it,
		// in an overflowing scrollable parent the slot snaps to 0 on the very first
		// frame and siblings jump up by `fullSize` before our per-frame transform can
		// compensate.
		slotEl.style.flexShrink = '0'
		slotEl.style.overflow = 'hidden'

		// Matches the ghost flight duration so both animations finish together.
		const duration = this.animation.slotCollapse.duration
		const easeFn = parseEasing(this.animation.slotCollapse.easing)
		return new Promise<void>(resolve => {
			const startTime = performance.now()

			const tick = (now: number) => {
				const elapsed = now - startTime
				const t = Math.min(elapsed / duration, 1)
				const eased = easeFn(t)
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
		// Ordering matters: set skip=true BEFORE reset() so Preview sees "skip" when session
		// clears; keep performingDrop=true across reset() so Preview.hide() reads it as true and
		// collapses instantly (otherwise it uses the delayed path). Clear on next frame.
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
