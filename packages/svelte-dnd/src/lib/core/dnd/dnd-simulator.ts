import type { DndState } from './dnd-state.svelte.js'
import type { DndEventEmitter } from './dnd-event-emitter.js'
import { DragSession } from './drag-session.svelte.js'
import type { DropZone, DropEvent, DropCancelledEvent, DndItemInfo, DndContainerInfo } from '../../types.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { Slot } from '../entities/slot.js'
import type { ResolvedAnimationConfig } from '../animation/animation-config.js'
import type { Behavior, BehaviorContext } from '../animation/behavior.js'
import type { AnimationStep } from '../animation/steps/animation-step.js'
import { flushSync } from 'svelte'
import { AnimationPipeline } from '../animation/steps/animation-pipeline.js'
import { GhostToTargetStep } from '../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../animation/steps/ghost-return-step.js'
import { DEFAULT_ANIMATION_CONFIG } from '../animation/animation-config.js'
import { resolveBehaviors, wrapWithBehaviors, findTargetSlotWrapper } from '../animation/apply-behaviors.js'

export interface ContainerPosition {
	containerId: string
	/** Default 0 for `target` containers; required for sortable destinations. */
	position?: number
}

export interface AnimateItemOptions {
	/** Where the item should fly to. */
	to: ContainerPosition
	/** Where the item starts. Defaults to its current location in the slot map. */
	from?: ContainerPosition
	/**
	 * Animation style:
	 * - `'drop'` (default) — uses `GhostToTargetStep` for both same- and cross-container moves.
	 * - `'return'` — uses `GhostReturnStep` when the destination is the same container,
	 *   falls back to `GhostToTargetStep` for cross-container moves.
	 */
	style?: 'return' | 'drop'
	/** Fire `onDrop` (style 'drop') or `onDropCancelled` (style 'return') after the animation. */
	emitEvents?: boolean
	/** Override the configured drop/return duration. */
	duration?: number
	/**
	 * Per-call override for the destination droppable's behaviors. Replaces both
	 * the strategy-level and controller-level defaults for this animation.
	 */
	behaviors?: Behavior[]
}

export interface AnimateLayoutOptions {
	/**
	 * Items to FLIP. Defaults to every registered draggable except `state.draggedItem`
	 * (whose ghost flight handles its own animation during a real drag).
	 */
	items?: string[]
	/**
	 * When `true`, copies the missing classes from each item's pre-state classList
	 * onto the post-state element so class-driven CSS properties (border-radius,
	 * scale, background, color, …) transition together with the FLIP transform.
	 */
	morph?: boolean
	/** Override the configured swap duration. */
	duration?: number
}

type EmitKind = 'drop' | 'cancel'

export class DndSimulator {
	constructor(
		private state: DndState,
		private droppablesById: Map<string, Droppable>,
		private slots: Map<HTMLElement, Slot>,
		private eventEmitter?: DndEventEmitter,
		private animation: ResolvedAnimationConfig = DEFAULT_ANIMATION_CONFIG,
		private defaultBehaviors: Behavior[] = []
	) {}

	setDefaultBehaviors(behaviors: Behavior[]) {
		this.defaultBehaviors = behaviors
	}

	setAnimationConfig(animation: ResolvedAnimationConfig) {
		this.animation = animation
	}

	/**
	 * Animate a single item flying to a destination through the ghost system.
	 *
	 * @example
	 * // Animate task `t1` from backlog to position 0 in in-progress.
	 * await controller.animateItem('t1', {
	 *     to: { containerId: 'in-progress', position: 0 }
	 * })
	 *
	 * @example
	 * // Undo a move — fly back to where it came from with scroll-aware return.
	 * await controller.animateItem('t1', {
	 *     to: { containerId: 'backlog', position: 4 },
	 *     style: 'return'
	 * })
	 */
	animateItem(itemId: string, options: AnimateItemOptions): Promise<void> {
		const { to, from, style = 'drop', emitEvents = false, duration, behaviors } = options

		const sourceContainerId = from?.containerId ?? this.findItemContainer(itemId)
		if (!sourceContainerId) {
			return Promise.reject(new Error(`DndSimulator.animateItem: item "${itemId}" not found in any container`))
		}
		const toPosition = to.position ?? 0
		const useReturnStep = style === 'return' && to.containerId === sourceContainerId
		const stepDuration = useReturnStep
			? duration ?? this.animation.return
			: duration ?? this.animation.drop

		const makeStep = (): AnimationStep => {
			const baseStep = useReturnStep
				? new GhostReturnStep(this.state, to.containerId, toPosition, this.droppablesById, stepDuration)
				: new GhostToTargetStep(this.state, this.syntheticZone(to.containerId, toPosition), this.droppablesById, stepDuration)
			const targetDroppable = this.droppablesById.get(to.containerId) ?? null
			const resolved = behaviors ?? resolveBehaviors(targetDroppable, this.defaultBehaviors)
			const ctx: BehaviorContext = {
				state: this.state,
				direction: targetDroppable?.layout === 'horizontal' ? 'horizontal' : 'vertical',
				targetEl: findTargetSlotWrapper(targetDroppable, toPosition),
				container: targetDroppable?.element ?? null,
				duration: stepDuration,
				padding: targetDroppable?.spacing ?? 0
			}
			return wrapWithBehaviors(baseStep, resolved, ctx)
		}

		const emitKind: EmitKind = style === 'return' ? 'cancel' : 'drop'
		return this.run(itemId, sourceContainerId, to.containerId, toPosition, makeStep, emitEvents, emitKind)
	}

	/**
	 * Animate a layout/state change. Captures item rects before `applyState`,
	 * mutates state via `applyState`, then FLIPs items to their new positions.
	 *
	 * @example
	 * // Sort the list and animate every item to its new spot.
	 * await controller.animateLayout(() => {
	 *     items = [...items].sort((a, b) => a.label.localeCompare(b.label))
	 * })
	 *
	 * @example
	 * // Swap two items by id and morph their class-driven shapes.
	 * await controller.animateLayout(() => swap(a, b), {
	 *     items: [a.id, b.id],
	 *     morph: true
	 * })
	 */
	async animateLayout(
		applyState: () => void | Promise<void>,
		options: AnimateLayoutOptions = {}
	): Promise<void> {
		const { items, morph = false, duration = this.animation.layout } = options
		const ids = items ?? this.collectAllItemIds().filter((id) => id !== this.state.draggedItem)

		// Capture old rects (visual rects — include any active translates) and class lists.
		const oldRects = new Map<string, DOMRect>()
		const oldClasses = morph ? new Map<string, string[]>() : null
		for (const id of ids) {
			const el = this.findElementById(id)
			if (!el) continue
			oldRects.set(id, el.getBoundingClientRect())
			if (oldClasses) oldClasses.set(id, [...el.classList])
		}

		// Apply state change (sync or async).
		const result = applyState()
		if (result && typeof (result as Promise<unknown>).then === 'function') await result

		// Synchronously flush pending Svelte updates so the new DOM layout is readable
		// in the same sync block as the inverse transform below. `await tick()` would
		// leave a microtask gap during which the browser could paint the post-state
		// layout — visible as a 1-frame jump to the new position.
		flushSync()

		// Invert — apply inverse transforms (and restore the old class diff when morphing)
		// so items visually stay at their pre-state-change positions.
		interface Patched { el: HTMLElement; addedClasses: string[] }
		const elements: Patched[] = []
		for (const id of ids) {
			const el = this.findElementById(id)
			const oldRect = oldRects.get(id)
			if (!el || !oldRect) continue

			const newRect = el.getBoundingClientRect()
			const dx = oldRect.left - newRect.left
			const dy = oldRect.top - newRect.top

			let addedClasses: string[] = []
			if (oldClasses) {
				const old = oldClasses.get(id) ?? []
				const newSet = new Set(el.classList)
				addedClasses = old.filter((c) => !newSet.has(c))
				for (const c of addedClasses) el.classList.add(c)
			}

			if (dx === 0 && dy === 0 && addedClasses.length === 0) continue

			el.style.transition = 'none'
			if (dx !== 0 || dy !== 0) el.style.transform = `translate(${dx}px, ${dy}px)`
			elements.push({ el, addedClasses })
		}

		if (elements.length === 0) return

		// Double rAF to force reflow before enabling transitions.
		await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

		// Play — animate to final positions/styles. `all` lets class-driven properties
		// (border-radius, scale, color, …) ride along with the FLIP transform.
		const transitionProp = morph ? 'all' : 'transform'
		for (const { el, addedClasses } of elements) {
			el.style.transition = `${transitionProp} ${duration}ms ease`
			el.style.transform = ''
			for (const c of addedClasses) el.classList.remove(c)
		}

		await new Promise<void>((resolve) => setTimeout(resolve, duration + 50))

		for (const { el } of elements) {
			el.style.transition = ''
		}
	}

	// --- Private ---

	private run(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		makeStep: () => AnimationStep,
		emitEvents: boolean,
		emitKind: EmitKind
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.state.dragging) {
				reject(new Error('DndSimulator: cannot animate while a drag is in progress'))
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

			// Let each strategy capture transform-free state before reactive cycle runs.
			for (const droppable of this.droppablesById.values()) {
				droppable.strategy.onSessionStart?.(droppable, session)
			}

			this.state.startSession(session)
			// setAnimating(true) makes the dragged element opacity:0 immediately via
			// the animatingReturn path, without disabling CSS transitions on siblings.
			this.state.setAnimating(true)

			const step = makeStep()

			// Wait one frame for DndPreview to render at toContainerId/toPosition.
			requestAnimationFrame(() => {
				AnimationPipeline.chain(step).execute().then(() => {
					// setPerformingDrop(true) so Preview.hide() collapses instantly.
					this.state.setPerformingDrop(true)
					if (emitEvents && this.eventEmitter) {
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

	private collectAllItemIds(): string[] {
		const ids: string[] = []
		for (const slot of this.slots.values()) {
			ids.push(slot.draggable.id)
		}
		return ids
	}

	private findItemContainer(itemId: string): string | null {
		for (const droppable of this.droppablesById.values()) {
			if (droppable.getSortedSlots().some((s) => s.draggable.id === itemId)) {
				return droppable.id
			}
		}
		return null
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
