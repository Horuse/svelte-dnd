import type { DndState } from './dnd-state.svelte.js'
import type { DndEventEmitter } from './dnd-event-emitter.js'
import { DragSession } from './drag-session.svelte.js'
import type { DropZone, DropEvent, DndItemInfo, DndContainerInfo } from '../../types.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { Slot } from '../entities/slot.js'
import { AnimationPipeline } from '../animation/steps/animation-pipeline.js'
import { GhostToTargetStep } from '../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../animation/steps/ghost-return-step.js'

export interface SimulateOptions {
	emitEvents?: boolean
}

export class DndSimulator {
	constructor(
		private state: DndState,
		private droppablesById: Map<string, Droppable>,
		private slots: Map<HTMLElement, Slot>,
		private eventEmitter?: DndEventEmitter
	) {}

	/**
	 * Animate an item flying from its current DOM position back to a destination.
	 * Uses GhostReturnStep (scroll-aware) when staying in the same container,
	 * GhostToTargetStep when crossing containers.
	 * Does NOT fire any events.
	 */
	simulateReturn(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number
	): Promise<void> {
		const useSameContainerReturn = toContainerId === fromContainerId
		const step = () => useSameContainerReturn
			? new GhostReturnStep(this.state, toContainerId, toPosition, this.droppablesById)
			: new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition), this.droppablesById)

		return this.run(itemId, fromContainerId, toContainerId, toPosition, step)
	}

	/**
	 * Animate an item flying from its current DOM position to a target container/position.
	 * Always uses GhostToTargetStep regardless of containers.
	 * Does NOT fire any events.
	 */
	simulateDrop(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		options: SimulateOptions = {}
	): Promise<void> {
		const step = () =>
			new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition), this.droppablesById)

		return this.run(itemId, fromContainerId, toContainerId, toPosition, step, options)
	}

	// --- Private ---

	private run(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		makeStep: () => GhostToTargetStep | GhostReturnStep,
		options: SimulateOptions = {}
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
				position: toPosition,
				visible: true
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
					if (options.emitEvents) {
						const toDroppable = this.droppablesById.get(toContainerId)
						if (toDroppable && this.eventEmitter) {
							const itemInfo: DndItemInfo = { id: itemId, data: undefined, type: undefined, element }
							const sourceInfo: DndContainerInfo = fromDroppable.toContainerInfo(positionInFrom >= 0 ? positionInFrom : 0)
							const targetInfo: DndContainerInfo = toDroppable.toContainerInfo(toPosition)
							const dropEvent: DropEvent = { item: itemInfo, source: sourceInfo, target: targetInfo }
							this.eventEmitter.notifyDrop(dropEvent)
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
			direction: 'vertical',
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
		duration = 300
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
		duration = 300
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
