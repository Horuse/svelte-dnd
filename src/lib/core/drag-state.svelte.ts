import type { DropZone, DropPreview } from '../types.js'

export class DragState {
	isDragging = $state(false)
	dragElement = $state<HTMLElement | null>(null)
	draggedItemId = $state<string | null>(null)
	draggedItemType = $state<string | null>(null)
	draggedItemData = $state<Record<string, any> | undefined>(undefined)
	currentTransform = $state<{ x: number; y: number } | null>(null)
	elementSize = $state<{ width: number; height: number } | null>(null)
	originalPosition = $state<{ x: number; y: number } | null>(null)
	isAnimating = $state(false)
	dropZones = $state<DropZone[]>([])
	currentDropPreview = $state<DropPreview | null>(null)
	showDebugZones = $state(false)
	isPerformingDrop = $state(false)
	shouldSkipDropPreviewAnimation = $state(false)
	originContainerId = $state<string | null>(null)
	originPosition = $state(0)

	get dragging() {
		return this.isDragging
	}

	get element() {
		return this.dragElement
	}

	get transform() {
		return this.currentTransform
	}

	get draggedItem() {
		return this.draggedItemId
	}

	get draggedType() {
		return this.draggedItemType
	}

	get size() {
		return this.elementSize
	}

	get animating() {
		return this.isAnimating
	}

	get dropPreview() {
		return this.currentDropPreview
	}

	get zones() {
		return this.dropZones
	}

	get debugZones() {
		return this.showDebugZones
	}

	get performingDrop() {
		return this.isPerformingDrop
	}

	get skipDropPreviewAnimation() {
		return this.shouldSkipDropPreviewAnimation
	}

	setDragging(value: boolean) {
		this.isDragging = value
	}

	setElement(element: HTMLElement | null) {
		this.dragElement = element
	}

	setDraggedItemId(id: string | null) {
		this.draggedItemId = id
	}

	setDraggedItemType(type: string | null) {
		this.draggedItemType = type
	}

	setDraggedItemData(data: Record<string, any> | undefined) {
		this.draggedItemData = data
	}

	setTransform(transform: { x: number; y: number } | null) {
		this.currentTransform = transform
	}

	setElementSize(size: { width: number; height: number } | null) {
		this.elementSize = size
	}

	setOriginalPosition(position: { x: number; y: number } | null) {
		this.originalPosition = position
	}

	setAnimating(value: boolean) {
		this.isAnimating = value
	}

	setDropZones(zones: DropZone[]) {
		this.dropZones = zones
	}

	setDropPreview(preview: DropPreview | null) {
		this.currentDropPreview = preview
	}

	setDebugZones(value: boolean) {
		this.showDebugZones = value
	}

	setPerformingDrop(value: boolean) {
		this.isPerformingDrop = value
	}

	setSkipDropPreviewAnimation(value: boolean) {
		this.shouldSkipDropPreviewAnimation = value
	}

	setOriginContainerId(id: string | null) {
		this.originContainerId = id
	}

	setOriginPosition(position: number) {
		this.originPosition = position
	}

	toggleDebugZones() {
		this.showDebugZones = !this.showDebugZones
	}

	reset() {
		this.isDragging = false
		this.dragElement = null
		this.currentTransform = null
		this.draggedItemId = null
		this.draggedItemType = null
		this.draggedItemData = undefined
		this.elementSize = null
		this.originalPosition = null
		this.isAnimating = false
		this.originContainerId = null
		this.originPosition = 0
		this.dropZones = []
		this.currentDropPreview = null
	}
}
