import type { DndState } from './dnd-state.svelte.js'
import type { ContainerRegistry } from '../containers/container-registry.js'
import type { ContainerStrategy } from '../containers/strategies/container-strategy.js'
import type { DragSession } from './drag-session.js'
import type { DropZone, DndMode } from '../../types.js'
import { DOMHelper } from '../utils/dom-helper.js'
import { AnimationPipeline } from '../animation/steps/animation-pipeline.js'
import { GhostToTargetStep } from '../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../animation/steps/ghost-return-step.js'
import { SortableContainerStrategy } from '../containers/strategies/sortable-container-strategy.js'

export class DndSimulator {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry,
		private strategyMap: Map<string, ContainerStrategy> = new Map()
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
		const step = (session: DragSession) => useSameContainerReturn
			? new GhostReturnStep(this.state, toContainerId, toPosition)
			: new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition))

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
		toPosition: number
	): Promise<void> {
		const step = (_session: DragSession) =>
			new GhostToTargetStep(this.state, this.syntheticZone(toContainerId, toPosition))

		return this.run(itemId, fromContainerId, toContainerId, toPosition, step)
	}

	// --- Private ---

	private run(
		itemId: string,
		fromContainerId: string,
		toContainerId: string,
		toPosition: number,
		makeStep: (session: DragSession) => GhostToTargetStep | GhostReturnStep
	): Promise<void> {
		return new Promise<void>((resolve, reject) => {
			if (this.state.dragging) {
				reject(new Error(`DndSimulator: cannot simulate while a drag is in progress`))
				return
			}

			const fromContainer = DOMHelper.findContainer(fromContainerId)
			if (!fromContainer) {
				reject(new Error(`DndSimulator: container "${fromContainerId}" not found in DOM`))
				return
			}

			const items = DOMHelper.findDraggableItemsInContainer(fromContainer)
			const element = items.find((el) => el.getAttribute('data-dnd-drag-id') === itemId) ?? null
			if (!element) {
				reject(new Error(`DndSimulator: item "${itemId}" not found in container "${fromContainerId}"`))
				return
			}

			const rect = element.getBoundingClientRect()
			const positionInFrom = items.indexOf(element)

			// For cross-container moves prefer slot size from the target container so the
			// gap (e.g. space-y-2) is included. Fall back to the source element's own size.
			let slotSize = DOMHelper.calculateSlotSize(element, items)
			if (toContainerId !== fromContainerId) {
				const toContainer = DOMHelper.findContainer(toContainerId)
				if (toContainer) {
					const toItems = DOMHelper.findDraggableItemsInContainer(toContainer)
					if (toItems.length > 0) {
						slotSize = DOMHelper.calculateSlotSize(toItems[0], toItems)
					}
				}
			}

			const session: DragSession = {
				itemId,
				itemData: undefined,
				element,
				originContainerId: fromContainerId,
				originPosition: positionInFrom >= 0 ? positionInFrom : 0,
				startRect: rect,
				ghostTransform: { x: rect.left, y: rect.top },
				dropPreview: {
					containerId: toContainerId,
					position: toPosition,
					visible: true,
					draggedElementHeight: element.offsetHeight,
					draggedElementWidth: element.offsetWidth
				},
				ghostSize: { width: element.offsetWidth, height: element.offsetHeight },
				slotSize,
				draggedItemType: null,
				source: 'programmatic'
			}

			// Register containers so TranslationEngine can compute item shifts
			this.ensureContainerRegistered(fromContainerId, fromContainer)
			if (toContainerId !== fromContainerId) {
				const toContainer = DOMHelper.findContainer(toContainerId)
				if (toContainer) this.ensureContainerRegistered(toContainerId, toContainer)
			}

			this.state.startSession(session)
			// setAnimating(true) makes the dragged element opacity:0 immediately via
			// the animatingReturn path, without disabling CSS transitions on siblings.
			this.state.setAnimating(true)

			const step = makeStep(session)

			// Wait one frame for DndPreview placeholder to render at toContainerId/toPosition
			requestAnimationFrame(() => {
				AnimationPipeline.chain(step).execute().then(() => {
					// setPerformingDrop(true) here so PreviewHandler.hide() collapses instantly
					this.state.setPerformingDrop(true)
					this.cleanup()
					resolve()
				})
			})
		})
	}

	private ensureContainerRegistered(containerId: string, container: HTMLElement): void {
		if (this.registry.getStrategy(containerId)) return
		const mode = (container.getAttribute('data-dnd-mode') ?? 'sortable') as DndMode
		const strategy = this.strategyMap.get(mode) ?? new SortableContainerStrategy(this.state)
		this.registry.registerContainer(containerId, container, strategy)
	}

	private syntheticZone(containerId: string, position: number): DropZone {
		return {
			containerId,
			position,
			direction: 'vertical',
			rect: { x: 0, y: 0, width: 0, height: 0 }
		}
	}

	private cleanup(): void {
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
