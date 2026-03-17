import { DragState } from './drag-state.svelte.js'
import { AnimationController } from '../animation/animation-controller.js'
import { ScrollController } from '../scroll/scroll-controller.js'
import { DropZoneCalculator } from '../zones/dropzone-calculator.js'
import { DOMHelper } from '../dom/dom-helper.js'
import { DragEventEmitter } from './drag-event-emitter.js'
import { TranslationCalculator } from '../zones/translation-calculator.svelte.js'
import type { DndDragEvent, DndDropEvent, DropZone, DndDirection, DragStartCallback, DragEndCallback, DropCallback, ZonesInvalidatedCallback } from '../../types.js'

export type { DragStartCallback, DragEndCallback, DropCallback, ZonesInvalidatedCallback } from '../../types.js'

/**
 * Central controller for drag-and-drop. Create one instance and pass it to
 * `DndProvider` — all child `DndDroppable` and `DndDraggable` components will
 * share the same state.
 *
 * @example
 * ```ts
 * const controller = new DragController()
 *
 * controller.onDrop((sourceId, sourceData, targetContainerId, position) => {
 *   // reorder / move items in your data model
 * })
 * ```
 */
export class DragController {
	private state = new DragState()
	private animationController = new AnimationController(this.state)
	private scrollController = new ScrollController(this.state, {
		onZoneRefresh: () => this.eventEmitter.notifyZonesInvalidated(),
		onMouseUpdate: (x, y) => this.updateMousePosition(x, y)
	})
	private droppableDataRegistry = new Map<string, Record<string, any>>()
	private dropZoneCalculator = new DropZoneCalculator(this.state, this.droppableDataRegistry)
	private eventEmitter = new DragEventEmitter()
	private translationCalc = new TranslationCalculator(this.state)

	// --- Reactive state (read-only) ---

	/** CSS translate offsets for each draggable item during an active drag. Keyed by item id. */
	get translations() { return this.translationCalc.translations }

	/** `true` while the user is dragging an item. */
	get dragging() { return this.state.dragging }

	/** The DOM element currently being dragged. */
	get element() { return this.state.element }

	/** Current `{ x, y }` transform of the ghost element. */
	get transform() { return this.state.transform }

	/** Id of the item being dragged. */
	get draggedItem() { return this.state.draggedItem }

	/** `type` field from the dragged item's data, used for accept filtering. */
	get draggedType() { return this.state.draggedType }

	/** Full data object of the dragged item. */
	get draggedItemData() { return this.state.draggedItemData }

	/** Width/height of the dragged element. */
	get size() { return this.state.size }

	/** `true` while the ghost is animating back to its origin. */
	get animatingReturn() { return this.state.animating }

	/** Current drop preview (target container + insertion position). */
	get dropPreview() { return this.state.dropPreview }

	/** All registered drop zones across every `DndDroppable`. */
	get dropZones() { return this.state.zones }

	get debugZones() { return this.state.debugZones }

	/** Drop zones filtered to only those that accept the currently dragged item type. */
	get filteredDropZones() { return this.dropZoneCalculator.filteredZones }

	/** `true` while the drop animation is in progress. */
	get performingDrop() { return this.state.performingDrop }

	get skipDropPreviewAnimation() { return this.state.skipDropPreviewAnimation }

	// --- Event subscriptions ---
	// Each method returns an unsubscribe function: `const off = controller.onDrop(...); off()`

	/** Fired when a drag begins. */
	onDragStart(cb: DragStartCallback)               { return this.eventEmitter.onDragStart(cb) }

	/** Fired when a drag ends (drop or cancel). */
	onDragEnd(cb: DragEndCallback)                   { return this.eventEmitter.onDragEnd(cb) }

	/**
	 * Fired when an item is successfully dropped into a container.
	 *
	 * @param cb `(sourceId, sourceData, targetContainerId, position) => void`
	 */
	onDrop(cb: DropCallback)                         { return this.eventEmitter.onDrop(cb) }

	/**
	 * Fired after auto-scroll moves a container, invalidating existing drop zone
	 * coordinates. Subscribe to recalculate zones if you manage them manually.
	 */
	onZonesInvalidated(cb: ZonesInvalidatedCallback) { return this.eventEmitter.onZonesInvalidated(cb) }

	// --- Lifecycle (called by DndDraggable / DndDroppable internally) ---

	setSkipDropPreviewAnimation(value: boolean) {
		this.state.setSkipDropPreviewAnimation(value)
	}

	registerDroppableData(id: string, data: Record<string, any>) {
		this.droppableDataRegistry.set(id, data)
	}

	unregisterDroppableData(id: string) {
		this.droppableDataRegistry.delete(id)
	}

	startDrag(
		element: HTMLElement,
		itemId: string,
		initialPosition: { x: number; y: number },
		data?: Record<string, any>
	) {
		const rect = element.getBoundingClientRect()

		const containerEl = element.closest('[data-dnd-drop-id]')
		if (containerEl) {
			const containerId = containerEl.getAttribute('data-dnd-drop-id')!
			const items = DOMHelper.findDraggableItemsInContainer(containerEl)
			const position = items.indexOf(element)
			this.state.setOriginContainerId(containerId)
			this.state.setOriginPosition(position >= 0 ? position : 0)
			this.state.setDragSlotSize(DOMHelper.calculateSlotSize(element, items))
		}

		this.state.setDragging(true)
		this.state.setElement(element)
		this.state.setDraggedItemId(itemId)
		this.state.setDraggedItemType(data?.type || null)
		this.state.setDraggedItemData(data)
		this.state.setTransform(initialPosition)
		this.state.setElementSize({
			width: element.offsetWidth,
			height: element.offsetHeight
		})
		this.state.setOriginalPosition({
			x: rect.left,
			y: rect.top
		})

		this.state.setSkipDropPreviewAnimation(true)
		this.eventEmitter.notifyDragStart(itemId)
	}

	updateTransform(transform: { x: number; y: number }) {
		this.state.setTransform(transform)
	}

	updateMousePosition(mouseX: number, mouseY: number) {
		if (this.state.dragging) {
			const ghostCenter = this.getGhostCenter()
			this.dropZoneCalculator.updateDropPreview(ghostCenter)
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
	}

	private getGhostCenter(): { x: number; y: number } {
		const transform = this.state.transform
		const size = this.state.elementSize
		if (transform && size) {
			return {
				x: transform.x + size.width / 2,
				y: transform.y + size.height / 2
			}
		}
		return this.state.transform ?? { x: 0, y: 0 }
	}

	performDrop(
		sourceId: string,
		sourceData: any,
		targetContainerId: string,
		position: number
	) {
		const targetZone = this.state.zones.find(
			(zone) => zone.containerId === targetContainerId && zone.position === position
		)

		this.state.setPerformingDrop(true)

		if (targetZone && this.state.element && this.state.transform) {
			this.animationController.animateToTarget(targetZone, () => {
				this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
				this.finalizeDragEnd(sourceId)
			})
		} else {
			this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
			this.finalizeDragEnd(sourceId)
		}
	}

	/** Cancel the current drag and animate the ghost back to its origin. */
	endDrag(shouldAnimate = true) {
		const itemId = this.state.draggedItem

		if (shouldAnimate && this.state.originContainerId !== null) {
			this.state.setSkipDropPreviewAnimation(true)
			this.state.setDropPreview({
				containerId: this.state.originContainerId,
				position: this.state.originPosition,
				visible: true,
				draggedElementHeight: this.state.elementSize?.height,
				draggedElementWidth: this.state.elementSize?.width
			})
		}

		if (shouldAnimate && this.state.element && this.state.transform) {
			requestAnimationFrame(() => {
				this.animationController.animateReturn(() => {
					this.finalizeDragEnd(itemId)
				})
			})
		} else {
			this.finalizeDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}

	registerDropZones(zones: DropZone[]) {
		this.state.setDropZones(zones)
	}

	calculateDropZones(
		containerId: string,
		containerElement: HTMLElement,
		direction: DndDirection = 'vertical'
	): DropZone[] {
		return this.dropZoneCalculator.calculateDropZones(containerId, containerElement, direction)
	}

	mergeDropZones(
		existingZones: DropZone[],
		newZones: DropZone[],
		containerId: string
	): DropZone[] {
		return this.dropZoneCalculator.mergeZones(existingZones, newZones, containerId)
	}

	/** Toggle visual overlay of drop zones — useful for debugging layout. */
	toggleDebugZones() {
		this.state.toggleDebugZones()
	}

	private finalizeDragEnd(itemId: string | null) {
		this.state.setSkipDropPreviewAnimation(true)
		this.scrollController.clearAll()
		this.state.reset()
		requestAnimationFrame(() => {
			this.state.setPerformingDrop(false)
		})

		if (itemId) {
			this.eventEmitter.notifyDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}

	/** Release all resources. Call when the `DndProvider` is destroyed. */
	destroy() {
		this.scrollController.destroy()
		this.droppableDataRegistry.clear()
		this.eventEmitter.destroy()
	}
}
