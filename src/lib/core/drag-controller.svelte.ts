import { DragState } from './drag-state.svelte.js'
import { AnimationController } from './animation-controller.js'
import { ScrollController } from './scroll-controller.js'
import { DropZoneCalculator } from './dropzone-calculator.js'
import { DOMHelper } from './dom-helper.js'
import { DragEventEmitter } from './drag-event-emitter.js'
import { TranslationCalculator } from './translation-calculator.svelte.js'
import type { DndDragEvent, DndDropEvent, DropZone, DndDirection } from '../types.js'

export type { DragStartCallback, DragEndCallback, DropCallback } from '../types.js'

export class DragController {
	private state = new DragState()
	private animationController = new AnimationController(this.state)
	private scrollController = new ScrollController(this.state, {
		onZoneRefresh: () => this.refreshDropZones(),
		onMouseUpdate: (x, y) => this.updateMousePosition(x, y)
	})
	private droppableDataRegistry = new Map<string, Record<string, any>>()
	private dropZoneCalculator = new DropZoneCalculator(this.state, this.droppableDataRegistry)
	private draggableRegistry = new Map<string, HTMLElement>()
	private eventBus = new DragEventEmitter()
	private translationCalc = new TranslationCalculator(this.state)

	get translations() {
		return this.translationCalc.translations
	}

	get dragging() {
		return this.state.dragging
	}
	get element() {
		return this.state.element
	}
	get transform() {
		return this.state.transform
	}
	get draggedItem() {
		return this.state.draggedItem
	}
	get draggedType() {
		return this.state.draggedType
	}
	get draggedItemData() {
		return this.state.draggedItemData
	}
	get size() {
		return this.state.size
	}
	get animatingReturn() {
		return this.state.animating
	}
	get dropPreview() {
		return this.state.dropPreview
	}
	get dropZones() {
		return this.state.zones
	}
	get debugZones() {
		return this.state.debugZones
	}
	get filteredDropZones() {
		return this.dropZoneCalculator.filterZonesByDraggedItemType(
			this.state.zones,
			this.state.draggedItem || ''
		)
	}
	get performingDrop() {
		return this.state.performingDrop
	}
	get skipDropPreviewAnimation() {
		return this.state.skipDropPreviewAnimation
	}

	setSkipDropPreviewAnimation(value: boolean) {
		this.state.setSkipDropPreviewAnimation(value)
	}

	registerDraggable(id: string, element: HTMLElement) {
		this.draggableRegistry.set(id, element)
	}

	unregisterDraggable(id: string) {
		this.draggableRegistry.delete(id)
	}

	registerDroppableData(id: string, data: Record<string, any>) {
		this.droppableDataRegistry.set(id, data)
	}

	unregisterDroppableData(id: string) {
		this.droppableDataRegistry.delete(id)
	}

	onDragStart(callback: (itemId: string) => void) {
		return this.eventBus.onDragStart(callback)
	}

	onDragEnd(callback: (itemId: string) => void) {
		return this.eventBus.onDragEnd(callback)
	}

	onDrop(callback: (sourceId: string, sourceData: any, targetContainerId: string, position: number) => void) {
		return this.eventBus.onDrop(callback)
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

			const elementRect = element.getBoundingClientRect()
			const nextItem = items[position + 1]
			const prevItem = items[position - 1]
			if (nextItem) {
				const nextRect = nextItem.getBoundingClientRect()
				this.state.setDragSlotSize({
					width: nextRect.left - elementRect.left,
					height: nextRect.top - elementRect.top
				})
			} else if (prevItem) {
				const prevRect = prevItem.getBoundingClientRect()
				this.state.setDragSlotSize({
					width: elementRect.left - prevRect.left,
					height: elementRect.top - prevRect.top
				})
			} else {
				this.state.setDragSlotSize({ width: element.offsetWidth, height: element.offsetHeight })
			}
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
		this.eventBus.notifyDragStart(itemId)
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
				this.eventBus.notifyDrop(sourceId, sourceData, targetContainerId, position)
				this.finalizeDragEnd(sourceId)
			})
		} else {
			this.eventBus.notifyDrop(sourceId, sourceData, targetContainerId, position)
			this.finalizeDragEnd(sourceId)
		}
	}

	endDrag(shouldAnimate = true) {
		const itemId = this.state.draggedItem

		if (shouldAnimate && this.state.originContainerId !== null) {
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

	refreshDropZones() {
		this.eventBus.notifyDragStart(this.state.draggedItem || '')
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
			this.eventBus.notifyDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}

	destroy() {
		this.scrollController.destroy()
		this.droppableDataRegistry.clear()
		this.draggableRegistry.clear()
		this.eventBus.destroy()
	}
}
