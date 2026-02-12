import { DragState } from './drag-state.svelte.js'
import { AnimationController } from './animation-controller.js'
import { ScrollController } from './scroll-controller.js'
import { DropZoneCalculator } from './dropzone-calculator.js'
import type { DndDragEvent, DndDropEvent, DropZone, DndDirection } from '../types.js'

export type DragStartCallback = (itemId: string) => void
export type DragEndCallback = (itemId: string) => void
export type DropCallback = (
	sourceId: string,
	sourceData: any,
	targetContainerId: string,
	position: number
) => void

export class DragController {
	private state = new DragState()
	private animationController = new AnimationController(this.state)
	private scrollController = new ScrollController(this.state, {
		onZoneRefresh: () => this.refreshDropZones(),
		onMouseUpdate: (x, y) => this.updateMousePosition(x, y)
	})
	private droppableDataRegistry = new Map<string, Record<string, any>>()
	private dropZoneCalculator = new DropZoneCalculator(this.state, this.droppableDataRegistry)

	private dragStartCallbacks = new Set<DragStartCallback>()
	private dragEndCallbacks = new Set<DragEndCallback>()
	private dropCallbacks = new Set<DropCallback>()

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

	registerDroppableData(id: string, data: Record<string, any>) {
		this.droppableDataRegistry.set(id, data)
	}

	unregisterDroppableData(id: string) {
		this.droppableDataRegistry.delete(id)
	}

	onDragStart(callback: DragStartCallback) {
		this.dragStartCallbacks.add(callback)
		return () => this.dragStartCallbacks.delete(callback)
	}

	onDragEnd(callback: DragEndCallback) {
		this.dragEndCallbacks.add(callback)
		return () => this.dragEndCallbacks.delete(callback)
	}

	onDrop(callback: DropCallback) {
		this.dropCallbacks.add(callback)
		return () => this.dropCallbacks.delete(callback)
	}

	startDrag(
		element: HTMLElement,
		itemId: string,
		initialPosition: { x: number; y: number },
		data?: Record<string, any>
	) {
		const rect = element.getBoundingClientRect()

		const containerEl = element.closest('[data-drop-id]')
		if (containerEl) {
			const containerId = containerEl.getAttribute('data-drop-id')!
			const items = containerEl.querySelectorAll(':scope > [data-draggable-item]')
			const position = Array.from(items).indexOf(element)
			this.state.setOriginContainerId(containerId)
			this.state.setOriginPosition(position >= 0 ? position : 0)
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

		this.notifyDragStart(itemId)
	}

	updateTransform(transform: { x: number; y: number }) {
		this.state.setTransform(transform)
	}

	updateMousePosition(mouseX: number, mouseY: number) {
		if (this.state.dragging) {
			this.dropZoneCalculator.updateDropPreview({ x: mouseX, y: mouseY })
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
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
				this.state.setDropPreview(null)
				this.notifyDrop(sourceId, sourceData, targetContainerId, position)
				this.finalizeDragEnd(sourceId)
			})
		} else {
			this.state.setDropPreview(null)
			this.notifyDrop(sourceId, sourceData, targetContainerId, position)
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
				draggedElementHeight: this.state.elementSize?.height
			})
		}

		if (shouldAnimate && this.state.element && this.state.transform) {
			this.animationController.animateReturn(() => {
				this.finalizeDragEnd(itemId)
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
		this.notifyDragStart(this.state.draggedItem || '')
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

		if (itemId) {
			this.notifyDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}

	private notifyDragStart(itemId: string) {
		this.dragStartCallbacks.forEach((callback) => callback(itemId))
	}

	private notifyDragEnd(itemId: string) {
		this.dragEndCallbacks.forEach((callback) => callback(itemId))
	}

	private notifyDrop(
		sourceId: string,
		sourceData: any,
		targetContainerId: string,
		position: number
	) {
		this.dropCallbacks.forEach((callback) =>
			callback(sourceId, sourceData, targetContainerId, position)
		)
	}

	destroy() {
		this.scrollController.destroy()
		this.droppableDataRegistry.clear()
		this.dragStartCallbacks.clear()
		this.dragEndCallbacks.clear()
		this.dropCallbacks.clear()
	}
}
