import type { DropZone, DropPreview, DndDirection } from '../types.js'
import type { DragState } from './drag-state.svelte.js'
import { DOMHelper } from './dom-helper.js'

export class DropZoneCalculator {

	constructor(
		private state: DragState,
		private droppableDataRegistry: Map<string, Record<string, any>>
	) {}

	calculateDropZones(
		containerId: string,
		containerElement: HTMLElement,
		direction: DndDirection = 'vertical'
	): DropZone[] {
		if (!containerElement) return []

		const containerRect = DOMHelper.getRect(containerElement)

		const draggedId = this.state.draggedItem
		const draggableItems = DOMHelper.findDraggableItemsInContainer(containerElement).filter(
			(item) => item.getAttribute('data-dnd-drag-id') !== draggedId
		)

		if (draggableItems.length === 0) {
			return this.createEmptyContainerZone(containerId, containerRect, direction)
		}

		switch (direction) {
			case 'horizontal':
				return this.createHorizontalZones(containerId, containerRect, draggableItems)
			case 'grid':
				return this.createGridZones(containerId, containerRect, draggableItems)
			default:
				return this.createVerticalZones(containerId, containerRect, draggableItems)
		}
	}

	private createEmptyContainerZone(
		containerId: string,
		containerRect: DOMRect,
		direction: DndDirection
	): DropZone[] {
		return [
			{
				containerId,
				position: 0,
				direction,
				rect: {
					x: containerRect.left,
					y: containerRect.top,
					width: containerRect.width,
					height: Math.max(containerRect.height, 20)
				}
			}
		]
	}

	private createVerticalZones(
		containerId: string,
		containerRect: DOMRect,
		items: HTMLElement[]
	): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfHeight = itemRect.height / 2

			if (index === 0) {
				const zoneTop = Math.min(containerRect.top, itemRect.top)
				const zoneHeight = Math.max(
					halfHeight,
					itemRect.top - containerRect.top + halfHeight
				)

				zones.push({
					containerId,
					position: 0,
					direction: 'vertical',
					rect: {
						x: containerRect.left,
						y: zoneTop,
						width: containerRect.width,
						height: zoneHeight
					}
				})
			}

			const nextItem = items[index + 1]
			const zoneY = itemRect.top + halfHeight
			let zoneHeight = halfHeight

			if (nextItem) {
				const nextItemRect = DOMHelper.getRect(nextItem)
				const nextHalfHeight = nextItemRect.height / 2
				const gapBetweenItems = nextItemRect.top - itemRect.bottom
				zoneHeight = halfHeight + gapBetweenItems + nextHalfHeight
			} else {
				const remainingSpace = containerRect.bottom - zoneY
				zoneHeight = Math.max(halfHeight, remainingSpace)
			}

			zones.push({
				containerId,
				position: index + 1,
				direction: 'vertical',
				rect: {
					x: containerRect.left,
					y: zoneY,
					width: containerRect.width,
					height: zoneHeight
				}
			})
		})

		return zones
	}

	private createHorizontalZones(
		containerId: string,
		containerRect: DOMRect,
		items: HTMLElement[]
	): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfWidth = itemRect.width / 2

			if (index === 0) {
				const zoneLeft = Math.min(containerRect.left, itemRect.left)
				const zoneWidth = Math.max(
					halfWidth,
					itemRect.left - containerRect.left + halfWidth
				)

				zones.push({
					containerId,
					position: 0,
					direction: 'horizontal',
					rect: {
						x: zoneLeft,
						y: containerRect.top,
						width: zoneWidth,
						height: containerRect.height
					}
				})
			}

			const nextItem = items[index + 1]
			const zoneX = itemRect.left + halfWidth
			let zoneWidth = halfWidth

			if (nextItem) {
				const nextItemRect = DOMHelper.getRect(nextItem)
				const nextHalfWidth = nextItemRect.width / 2
				const gapBetweenItems = nextItemRect.left - itemRect.right
				zoneWidth = halfWidth + gapBetweenItems + nextHalfWidth
			} else {
				const remainingSpace = containerRect.right - zoneX
				zoneWidth = Math.max(halfWidth, remainingSpace)
			}

			zones.push({
				containerId,
				position: index + 1,
				direction: 'horizontal',
				rect: {
					x: zoneX,
					y: containerRect.top,
					width: zoneWidth,
					height: containerRect.height
				}
			})
		})

		return zones
	}

	private createGridZones(
		containerId: string,
		containerRect: DOMRect,
		items: HTMLElement[]
	): DropZone[] {
		const zones: DropZone[] = []
		const rows = this.groupItemsIntoRows(items)
		let positionIndex = 0

		rows.forEach((row, rowIndex) => {
			const nextRow = rows[rowIndex + 1]

			row.forEach((item, colIndex) => {
				const itemRect = DOMHelper.getRect(item)
				const halfWidth = itemRect.width / 2
				const halfHeight = itemRect.height / 2

				const zoneTop =
					rowIndex === 0
						? Math.min(containerRect.top, itemRect.top)
						: itemRect.top - halfHeight
				const zoneBottom = nextRow
					? itemRect.bottom + (DOMHelper.getRect(nextRow[0]).top - itemRect.bottom) / 2
					: Math.max(containerRect.bottom, itemRect.bottom)

				if (colIndex === 0) {
					const zoneLeft = Math.min(containerRect.left, itemRect.left)
					const zoneRight = itemRect.left + halfWidth

					zones.push({
						containerId,
						position: positionIndex,
						direction: 'grid',
						rect: {
							x: zoneLeft,
							y: zoneTop,
							width: zoneRight - zoneLeft,
							height: zoneBottom - zoneTop
						}
					})
					positionIndex++
				}

				const nextItem = row[colIndex + 1]
				const zoneLeft = itemRect.left + halfWidth
				let zoneRight: number

				if (nextItem) {
					const nextRect = DOMHelper.getRect(nextItem)
					zoneRight = nextRect.left + nextRect.width / 2
				} else {
					zoneRight = Math.max(containerRect.right, itemRect.right)
				}

				zones.push({
					containerId,
					position: positionIndex,
					direction: 'grid',
					rect: {
						x: zoneLeft,
						y: zoneTop,
						width: zoneRight - zoneLeft,
						height: zoneBottom - zoneTop
					}
				})
				positionIndex++
			})
		})

		return zones
	}

	private groupItemsIntoRows(items: HTMLElement[]): HTMLElement[][] {
		if (items.length === 0) return []

		const rows: HTMLElement[][] = []
		let currentRow: HTMLElement[] = [items[0]]
		let currentRowTop = DOMHelper.getRect(items[0]).top

		for (let i = 1; i < items.length; i++) {
			const itemRect = DOMHelper.getRect(items[i])
			const rowThreshold = DOMHelper.getRect(items[i]).height * 0.5

			if (Math.abs(itemRect.top - currentRowTop) < rowThreshold) {
				currentRow.push(items[i])
			} else {
				rows.push(currentRow)
				currentRow = [items[i]]
				currentRowTop = itemRect.top
			}
		}

		rows.push(currentRow)
		return rows
	}

	updateDropPreview(mousePos: { x: number; y: number }) {
		if (!this.state.dragging) {
			this.state.setDropPreview(null)
			return
		}

		const targetZone = this.findZoneAtPosition(mousePos)

		if (targetZone) {
			const preview: DropPreview = {
				containerId: targetZone.containerId,
				position: targetZone.position,
				visible: true,
				draggedElementHeight: this.state.size?.height,
				draggedElementWidth: this.state.size?.width
			}
			this.state.setDropPreview(preview)

			if (this.state.skipDropPreviewAnimation) {
				requestAnimationFrame(() => {
					this.state.setSkipDropPreviewAnimation(false)
				})
			}
		} else {
			this.state.setDropPreview(null)
		}
	}

	private findZoneAtPosition(mousePos: { x: number; y: number }): DropZone | null {
		const draggedItemId = this.state.draggedItem
		if (!draggedItemId) return null

		const filteredZones = this.filterZonesByDraggedItemType(
			this.state.zones,
			draggedItemId
		)

		for (const zone of filteredZones) {
			if (this.isPointInZone(mousePos, zone) && this.isPointInContainer(mousePos, zone.containerId)) {
				return zone
			}
		}
		return null
	}

	private isPointInContainer(point: { x: number; y: number }, containerId: string): boolean {
		const containerElement = DOMHelper.findContainer(containerId)
		if (!containerElement) return true

		const rect = DOMHelper.getRect(containerElement)
		return (
			point.x >= rect.left &&
			point.x <= rect.right &&
			point.y >= rect.top &&
			point.y <= rect.bottom
		)
	}

	get filteredZones(): DropZone[] {
		return this.filterZonesByDraggedItemType(this.state.zones, this.state.draggedItem || '')
	}

	filterZonesByDraggedItemType(zones: DropZone[], draggedItemId: string): DropZone[] {
		const draggedType = this.state.draggedType
		if (!draggedType) return zones

		return zones.filter((zone) => {
			const droppableData = this.droppableDataRegistry.get(zone.containerId)
			if (!droppableData) return true

			const accepts = droppableData.accepts || droppableData.type

			if (!accepts) return true

			if (Array.isArray(accepts)) {
				return accepts.includes(draggedType)
			}

			return accepts === draggedType
		})
	}

	private isPointInZone(point: { x: number; y: number }, zone: DropZone): boolean {
		return (
			point.x >= zone.rect.x &&
			point.x <= zone.rect.x + zone.rect.width &&
			point.y >= zone.rect.y &&
			point.y <= zone.rect.y + zone.rect.height
		)
	}

	mergeZones(
		existingZones: DropZone[],
		newZones: DropZone[],
		containerId: string
	): DropZone[] {
		const otherZones = existingZones.filter((z) => z.containerId !== containerId)
		return [...otherZones, ...newZones]
	}
}
