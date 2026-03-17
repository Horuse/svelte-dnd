import type { DropZone, DropPreview, DndDirection } from '../../types.js'
import type { DndState } from '../dnd/dnd-state.svelte.js'
import { DOMHelper } from '../utils/dom-helper.js'

/** @internal */
export class DropZoneCalculator {

	constructor(
		private state: DndState,
		private droppableDataRegistry: Map<string, Record<string, any>>
	) {}

	/**
	 * Recalculates all drop zones for a container based on current DOM positions.
	 * Called by DndDroppable on drag start and on scroll/resize.
	 * Excludes the dragged item itself so it doesn't create a zone at its own position.
	 */
	calculateDropZones(
		containerId: string,
		containerElement: HTMLElement,
		direction: DndDirection = 'vertical'
	): DropZone[] {
		if (!containerElement) return []

		const containerRect = DOMHelper.getRect(containerElement)

		const draggedId = this.state.draggedItem
		// Exclude the dragged element — its slot is handled via translations, not a drop zone
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

	/** Single full-container zone used when there are no items (empty droppable). */
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
					height: Math.max(containerRect.height, 20) // min 20px so empty containers are hittable
				}
			}
		]
	}

	/**
	 * Zone layout for vertical lists.
	 *
	 * Each item produces one zone — the drop slot AFTER it (position = index + 1).
	 * The first item additionally produces zone 0 (the slot BEFORE it).
	 *
	 * Zone boundaries:
	 * - Starts at the vertical midpoint of the current item
	 * - Ends at the vertical midpoint of the next item (or container bottom for the last item)
	 *
	 * Special case for zone 0 (before first item):
	 * - Top is clamped to container top to cover any padding above the first item
	 * - Height extends down to the midpoint of the first item
	 */
	private createVerticalZones(
		containerId: string,
		containerRect: DOMRect,
		items: HTMLElement[]
	): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfHeight = itemRect.height / 2

			// Zone 0: slot before the first item — covers container top padding + first half of item
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

			// Zone index+1: slot after this item — from its midpoint to the next item's midpoint
			const nextItem = items[index + 1]
			const zoneY = itemRect.top + halfHeight
			let zoneHeight = halfHeight

			if (nextItem) {
				// Stretch zone to cover the gap between items + half of the next item
				const nextItemRect = DOMHelper.getRect(nextItem)
				const nextHalfHeight = nextItemRect.height / 2
				const gapBetweenItems = nextItemRect.top - itemRect.bottom
				zoneHeight = halfHeight + gapBetweenItems + nextHalfHeight
			} else {
				// Last item: stretch to container bottom (covers bottom padding)
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

	/**
	 * Zone layout for horizontal lists. Mirror of createVerticalZones along the X axis.
	 *
	 * Zone 0: before the first item (covers left padding + first half of item).
	 * Zone index+1: from the midpoint of item N to the midpoint of item N+1.
	 * Last zone: stretches to container right edge.
	 */
	private createHorizontalZones(
		containerId: string,
		containerRect: DOMRect,
		items: HTMLElement[]
	): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfWidth = itemRect.width / 2

			// Zone 0: before the first item
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
				// Last item: stretch to container right edge
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

	/**
	 * Zone layout for grid (wrapping) containers.
	 *
	 * Items are grouped into rows first (by comparing top offsets).
	 * Each item produces one zone to its right; the leftmost item in each row
	 * additionally produces a zone to its left (position before that item in the row).
	 *
	 * Vertical boundaries:
	 * - First row top: clamped to container top
	 * - Between rows: midpoint between the bottom of current row and the top of the next
	 * - Last row bottom: clamped to container bottom
	 *
	 * Horizontal boundaries:
	 * - Left zone of first column: clamped to container left
	 * - Between columns: from current item's midpoint to next item's midpoint
	 * - Right zone of last column: clamped to container right
	 */
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

				// Vertical span of this row's zones
				const zoneTop =
					rowIndex === 0
						? Math.min(containerRect.top, itemRect.top)
						: itemRect.top - halfHeight
				const zoneBottom = nextRow
					? itemRect.bottom + (DOMHelper.getRect(nextRow[0]).top - itemRect.bottom) / 2
					: Math.max(containerRect.bottom, itemRect.bottom)

				// Extra zone before the first item in each row
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

				// Zone after this item (right half of current + left half of next, or to container edge)
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

	/**
	 * Groups a flat list of items into rows based on their vertical position.
	 * An item is considered part of the current row if its top offset differs by
	 * less than 50% of its own height from the row's reference top.
	 */
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

	/**
	 * Updates the active drop preview based on the ghost element's center position.
	 * - If hovering a valid zone → set preview visible at that position
	 * - If leaving a zone → set visible:false (triggers CSS out-animation), then clear after 300ms
	 * - skipDropPreviewAnimation flag suppresses the in-animation on drag start
	 */
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

			// First move after drag start — disable in-animation to avoid jarring pop-in
			if (this.state.skipDropPreviewAnimation) {
				requestAnimationFrame(() => {
					this.state.setSkipDropPreviewAnimation(false)
				})
			}
		} else {
			const current = this.state.dropPreview
			if (current?.visible) {
				// Keep dimensions but hide — lets the CSS out-animation play at full size
				this.state.setDropPreview({ ...current, visible: false })
				setTimeout(() => {
					// Guard: don't clear if a new visible preview appeared before timeout fires
					if (this.state.dropPreview && !this.state.dropPreview.visible) {
						this.state.setDropPreview(null)
					}
				}, 300)
			}
		}
	}

	/**
	 * Finds the drop zone that contains the given point, respecting container boundaries.
	 * A zone only activates if the point is also inside its container's bounding rect —
	 * this prevents zones from "leaking" outside overflow:hidden containers.
	 */
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

	/**
	 * Secondary containment check on top of isPointInZone.
	 * Needed because zones extend to container edges — without this check, a zone
	 * near the edge of container A could be hit while the cursor is inside container B.
	 * Returns true if no container element is found (fail-open).
	 */
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

	/**
	 * Filters zones to only those whose container accepts the currently dragged item type.
	 * A container with no `accepts` / `type` data accepts everything.
	 * Accepts can be a single string or an array of strings.
	 */
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

	/** Replaces all zones for a given container, keeping zones from other containers intact. */
	mergeZones(
		existingZones: DropZone[],
		newZones: DropZone[],
		containerId: string
	): DropZone[] {
		const otherZones = existingZones.filter((z) => z.containerId !== containerId)
		return [...otherZones, ...newZones]
	}
}
