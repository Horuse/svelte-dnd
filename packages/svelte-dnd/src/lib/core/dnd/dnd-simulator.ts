import type { DndState } from './dnd-state.svelte.js'
import type { DndEventEmitter } from './dnd-event-emitter.js'
import { DragSession } from './drag-session.svelte.js'
import type { DropZone, DropEvent, DropCancelledEvent, DndItemInfo, DndContainerInfo } from '../../types.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { Slot } from '../entities/slot.js'
import type { ResolvedAnimationConfig } from '../animation/animation-config.js'
import { AnimationPipeline } from '../animation/steps/animation-pipeline.js'
import { GhostToTargetStep } from '../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../animation/steps/ghost-return-step.js'
import { DEFAULT_ANIMATION_CONFIG } from '../animation/animation-config.js'

export interface SimulateOptions {
	/**
	 * When `true`, fires a real event on completion:
	 * `simulateDrop` → `onDrop`; `simulateReturn` → `onDropCancelled`.
	 * Defaults to `false`.
	 */
	emitEvents?: boolean
}

type EmitKind = 'drop' | 'cancel'

export class DndSimulator {
	constructor(
		private state: DndState,
		private droppablesById: Map<string, Droppable>,
		private slots: Map<HTMLElement, Slot>,
		private eventEmitter?: DndEventEmitter,
		private animation: ResolvedAnimationConfig = DEFAULT_ANIMATION_CONFIG
	) {}

	/**
	 * Animate an item flying from its current DOM position back to a destination.
	 * Uses GhostReturnStep (scroll-aware) when staying in the same container,
	 * GhostToTargetStep when crossing containers.
	 * Fires no events by default; pass `{ emitEvents: true }` to fire `onDropCancelled`.
	 */
	simulateReturn(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		options: SimulateOptions = {}
	): Promise<void> {
		const useSameContainerReturn = toContainerId === fromContainerId
		const step = () => useSameContainerReturn
			? new GhostReturnStep(this.state, toContainerId, toPosition, this.droppablesById, this.animation.returnDuration)
			: new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition), this.droppablesById, this.animation.dropDuration)

		return this.run(itemId, fromContainerId, toContainerId, toPosition, step, options, 'cancel')
	}

	/**
	 * Animate an item flying from its current DOM position to a target container/position.
	 * Always uses GhostToTargetStep regardless of containers.
	 * Fires no events by default; pass `{ emitEvents: true }` to fire `onDrop`.
	 */
	simulateDrop(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		options: SimulateOptions = {}
	): Promise<void> {
		const step = () =>
			new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition), this.droppablesById, this.animation.dropDuration)

		return this.run(itemId, fromContainerId, toContainerId, toPosition, step, options, 'drop')
	}

	// --- Private ---

	private run(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		makeStep: () => GhostToTargetStep | GhostReturnStep,
		options: SimulateOptions = {},
		emitKind: EmitKind = 'drop'
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.state.dragging) {
				reject(new Error(`DndSimulator: cannot simulate while a drag is in progress`))
				return
			}

			const fromDroppable = this.droppablesById.get(fromContainerId)
			if (!fromDroppable) {
				reject(new Error(`DndSimulator: container "${fromContainerId}" not found`))
				return
			}

			const fromSlot = fromDroppable.getSortedSlots().find((s) => s.draggable.id === itemId)
			if (!fromSlot) {
				reject(new Error(`DndSimulator: item "${itemId}" not found in container "${fromContainerId}"`))
				return
			}

			const element = fromSlot.draggable.element
			const rect = element.getBoundingClientRect()
			const positionInFrom = fromSlot.position

			let slotSize = fromSlot.getSize()
			if (toContainerId !== fromContainerId) {
				const toDroppable = this.droppablesById.get(toContainerId)
				if (toDroppable) {
					const toSlots = toDroppable.getSortedSlots()
					if (toSlots.length > 0) {
						const toSlotSize = toSlots[0].getSize()
						const gapH = toSlotSize.height - toSlots[0].draggable.element.offsetHeight
						const gapW = toSlotSize.width - toSlots[0].draggable.element.offsetWidth
						slotSize = {
							height: element.offsetHeight + Math.max(0, gapH),
							width: element.offsetWidth + Math.max(0, gapW)
						}
					}
				}
			}

			const session = new DragSession(
				fromSlot.draggable,
				fromDroppable,
				rect,
				{ x: rect.left, y: rect.top },
				'programmatic'
			)
			session.slotSize = slotSize
			session.ghostSize = { width: element.offsetWidth, height: element.offsetHeight }
			session.dropPreview = {
				containerId: toContainerId,
				position: toPosition
			}

			// Let each strategy capture whatever transform-free state it needs.
			for (const droppable of this.droppablesById.values()) {
				droppable.strategy.onSessionStart?.(droppable, session)
			}

			this.state.startSession(session)
			// setAnimating(true) makes the dragged element opacity:0 immediately via
			// the animatingReturn path, without disabling CSS transitions on siblings.
			this.state.setAnimating(true)

			const step = makeStep()

			// Wait one frame for DndPreview to render at toContainerId/toPosition
			requestAnimationFrame(() => {
				AnimationPipeline.chain(step).execute().then(() => {
					// setPerformingDrop(true) here so Preview.hide() collapses instantly
					this.state.setPerformingDrop(true)
					if (options.emitEvents && this.eventEmitter) {
						const draggable = fromSlot.draggable
						const itemInfo: DndItemInfo = {
							id: itemId,
							data: draggable.data,
							type: draggable.type,
							element
						}
						const sourceInfo: DndContainerInfo = fromDroppable.toContainerInfo(positionInFrom >= 0 ? positionInFrom : 0)

						if (emitKind === 'drop') {
							const toDroppable = this.droppablesById.get(toContainerId)
							if (toDroppable) {
								const targetInfo: DndContainerInfo = toDroppable.toContainerInfo(toPosition)
								const dropEvent: DropEvent = { item: itemInfo, source: sourceInfo, target: targetInfo }
								this.eventEmitter.notifyDrop(dropEvent)
							}
						} else {
							const cancelEvent: DropCancelledEvent = { item: itemInfo, source: sourceInfo }
							this.eventEmitter.notifyDropCancelled(cancelEvent)
						}
					}
					this.cleanup()
					resolve()
				})
			})
		})
	}

	private syntheticZone(containerId: string, position: number): DropZone {
		return {
			containerId,
			position,
			layout: 'vertical',
			rect: { x: 0, y: 0, width: 0, height: 0 }
		}
	}

	/**
	 * Animate two items swapping positions simultaneously using direct CSS transforms.
	 * Both elements animate at the same time without going through the ghost system.
	 * The caller is responsible for updating data state after the promise resolves.
	 */
	simulateSwap(
		idA: string, containerA: string,
		idB: string, containerB: string,
		duration: number = this.animation.swapDuration
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			const droppableA = this.droppablesById.get(containerA)
			const droppableB = this.droppablesById.get(containerB)
			if (!droppableA || !droppableB) {
				reject(new Error('DndSimulator.simulateSwap: container not found'))
				return
			}

			const slotA = droppableA.getSortedSlots().find((s) => s.draggable.id === idA)
			const slotB = droppableB.getSortedSlots().find((s) => s.draggable.id === idB)
			const elA = slotA?.draggable.element ?? null
			const elB = slotB?.draggable.element ?? null

			if (!elA || !elB) {
				reject(new Error(`DndSimulator.simulateSwap: item not found`))
				return
			}

			const rectA = elA.getBoundingClientRect()
			const rectB = elB.getBoundingClientRect()
			const dxA = rectB.left - rectA.left
			const dyA = rectB.top - rectA.top
			const dxB = rectA.left - rectB.left
			const dyB = rectA.top - rectB.top

			const transition = `transform ${duration}ms ease`
			elA.style.transition = transition
			elB.style.transition = transition
			elA.style.transform = `translate(${dxA}px, ${dyA}px)`
			elB.style.transform = `translate(${dxB}px, ${dyB}px)`

			let settled = 0
			const onDone = () => {
				settled++
				if (settled < 2) return
				elA.style.transition = ''
				elA.style.transform = ''
				elB.style.transition = ''
				elB.style.transform = ''
				resolve()
			}

			const endA = () => { elA.removeEventListener('transitionend', endA); onDone() }
			const endB = () => { elB.removeEventListener('transitionend', endB); onDone() }
			elA.addEventListener('transitionend', endA)
			elB.addEventListener('transitionend', endB)

			// Fallback in case transitionend doesn't fire (e.g. same position)
			setTimeout(() => {
				elA.removeEventListener('transitionend', endA)
				elB.removeEventListener('transitionend', endB)
				elA.style.transition = ''
				elA.style.transform = ''
				elB.style.transition = ''
				elB.style.transform = ''
				resolve()
			}, duration + 100)
		})
	}

	/**
	 * Animate multiple items simultaneously to their new positions using FLIP technique.
	 * Works across different containers.
	 * The caller is responsible for updating data state inside `applyState`.
	 */
	async simulateBatchSwap(
		ids: string[],
		applyState: () => void | Promise<void>,
		duration: number = this.animation.swapDuration
	): Promise<void> {
		// First — record current positions
		const oldRects = new Map<string, DOMRect>()
		for (const id of ids) {
			const el = this.findElementById(id)
			if (el) oldRects.set(id, el.getBoundingClientRect())
		}

		// Apply state change
		await applyState()

		// Last — wait for Svelte to update DOM
		const { tick } = await import('svelte')
		await tick()

		// Invert — apply inverted transforms so elements appear in old positions
		const elements: HTMLElement[] = []
		for (const id of ids) {
			const el = this.findElementById(id)
			const oldRect = oldRects.get(id)
			if (!el || !oldRect) continue
			const newRect = el.getBoundingClientRect()
			const dx = oldRect.left - newRect.left
			const dy = oldRect.top - newRect.top
			if (dx === 0 && dy === 0) continue
			el.style.transition = 'none'
			el.style.transform = `translate(${dx}px, ${dy}px)`
			elements.push(el)
		}

		if (elements.length === 0) return

		// Double rAF to force reflow before enabling transitions
		await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

		// Play — animate all to final positions simultaneously
		for (const el of elements) {
			el.style.transition = `transform ${duration}ms ease`
			el.style.transform = ''
		}

		await new Promise<void>((resolve) => setTimeout(resolve, duration + 50))

		for (const el of elements) {
			el.style.transition = ''
		}
	}

	private findElementById(id: string): HTMLElement | null {
		for (const slot of this.slots.values()) {
			if (slot.draggable.id === id) return slot.draggable.element
		}
		return null
	}

	private cleanup(): void {
		// Mirrors finalizeDragEnd ordering — see DropAnimationCoordinator.finalizeDragEnd
		// for the rationale behind the skip/performingDrop sequencing.
		this.state.setSkipDropPreviewAnimation(true)
		this.state.reset()
		requestAnimationFrame(() => {
			this.state.setPerformingDrop(false)
		})
		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}
}
