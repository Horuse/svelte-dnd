import type { ContainerStrategy } from './container-strategy.js'
import type { DropZone, DndMode } from '../../../types.js'
import type { DragSession } from '../../dnd/drag-session.svelte.js'
import type { DndState } from '../../dnd/dnd-state.svelte.js'
import type { AnimationStep } from '../../animation/steps/animation-step.js'
import type { Droppable } from '../../entities/droppable.svelte.js'
import { DOMHelper } from '../../utils/dom-helper.js'
import { GhostToTargetStep } from '../../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../../animation/steps/ghost-return-step.js'

export class SortableContainerStrategy implements ContainerStrategy {
	readonly mode: DndMode = 'sortable'

	constructor(private state: DndState, private droppablesById: Map<string, Droppable> = new Map()) {}

	calculateDropZones(droppable: Droppable, session: DragSession | null): DropZone[] {
		const containerId = droppable.id
		const containerRect = DOMHelper.getRect(droppable.element)
		const direction = droppable.direction
		const draggedId = session?.itemId ?? null

		const slots = droppable.getSortedSlots()
		const allItems = slots.map((s) => s.draggable.element)
		const idByEl = new Map(slots.map((s) => [s.draggable.element, s.draggable.id]))

		const draggableItems = allItems.filter((item) => idByEl.get(item) !== draggedId)

		if (draggableItems.length === 0) {
			return this.createEmptyZone(containerId, containerRect, direction)
		}

		switch (direction) {
			case 'horizontal': return this.createHorizontalZones(containerId, containerRect, draggableItems)
			case 'grid':       return this.createGridZones(containerId, containerRect, draggableItems)
			default:           return this.createVerticalZones(containerId, containerRect, draggableItems)
		}
	}

	getTranslations(droppable: Droppable, session: DragSession): Map<string, { x: number; y: number }> {
		const containerId = droppable.id
		const direction = droppable.direction
		if (direction === 'grid') return this.getGridTranslations(droppable, session)

		const map = new Map<string, { x: number; y: number }>()
		const preview = session.dropPreview
		const draggedId = session.itemId
		const slotSize = session.slotSize
		if (!slotSize) return map

		const size = direction === 'horizontal' ? slotSize.width : slotSize.height
		if (size === 0) return map

		const slots = droppable.getSortedSlots()
		const allItems = slots.map((s) => s.draggable.element)
		const idByEl = new Map(slots.map((s) => [s.draggable.element, s.draggable.id]))
		const draggedIdx = allItems.findIndex((el) => idByEl.get(el) === draggedId)

		if (!preview?.visible) {
			// No preview: collapse gap only if this is the origin container
			if (containerId !== session.originContainerId) return map
			if (draggedIdx === -1) return map

			for (const el of allItems) {
				const id = idByEl.get(el)
				if (!id || id === draggedId) continue
				if (allItems.indexOf(el) > draggedIdx) {
					map.set(id, direction === 'horizontal' ? { x: -size, y: 0 } : { x: 0, y: -size })
				}
			}
			return map
		}

		if (preview.containerId === containerId) {
			// This is the target container: shift items to make room
			const pos = preview.position
			const elementSize = direction === 'horizontal'
				? (preview.draggedElementWidth ?? 0)
				: (preview.draggedElementHeight ?? 0)
			const effectiveSize = size || elementSize
			if (effectiveSize === 0) return map

			for (const el of allItems) {
				const id = idByEl.get(el)
				if (!id || id === draggedId) continue
				const myIdx = allItems.indexOf(el)
				let offset = 0

				if (draggedIdx === -1) {
					// Cross-container: shift items from pos onwards
					offset = myIdx >= pos ? effectiveSize : 0
				} else {
					// Same container reorder
					const targetIdx = pos <= draggedIdx ? pos : pos + 1
					if (myIdx < draggedIdx && myIdx >= targetIdx) offset = effectiveSize
					else if (myIdx > draggedIdx && myIdx < targetIdx) offset = -effectiveSize
				}

				if (offset !== 0) {
					map.set(id, direction === 'horizontal' ? { x: offset, y: 0 } : { x: 0, y: offset })
				}
			}
		} else if (containerId === session.originContainerId && preview.containerId !== containerId) {
			// This is the origin container and item is moving to another container: collapse gap
			if (draggedIdx !== -1) {
				for (const el of allItems) {
					const id = idByEl.get(el)
					if (!id || id === draggedId) continue
					if (allItems.indexOf(el) > draggedIdx) {
						map.set(id, direction === 'horizontal' ? { x: -size, y: 0 } : { x: 0, y: -size })
					}
				}
			}
		}

		return map
	}

	getDropAnimation(session: DragSession, targetZone: DropZone): AnimationStep {
		return new GhostToTargetStep(this.state, targetZone, this.droppablesById)
	}

	getReturnAnimation(session: DragSession): AnimationStep {
		return new GhostReturnStep(this.state, session.originContainerId, session.originPosition, this.droppablesById)
	}

	// --- Grid translation helpers ---

	private getGridTranslations(droppable: Droppable, session: DragSession): Map<string, { x: number; y: number }> {
		const containerId = droppable.id
		const map = new Map<string, { x: number; y: number }>()
		const preview = session.dropPreview
		const draggedId = session.itemId
		const slots = droppable.getSortedSlots()
		const allItems = slots.map((s) => s.draggable.element)
		const idByEl = new Map(slots.map((s) => [s.draggable.element, s.draggable.id]))
		const draggedIdx = allItems.findIndex((el) => idByEl.get(el) === draggedId)

		const getId = (el: HTMLElement) => idByEl.get(el) ?? null
		const getRect = (el: HTMLElement) => DOMHelper.getRect(el)
		const delta = (from: HTMLElement, to: HTMLElement) => ({
			x: getRect(to).left - getRect(from).left,
			y: getRect(to).top - getRect(from).top
		})
		// Fallback offset when no neighbor exists (last item shifts out of bounds)
		const fallbackDelta = (el: HTMLElement, direction: 1 | -1) => {
			const r = getRect(el)
			return { x: r.width * direction, y: 0 }
		}

		if (!preview?.visible) {
			if (containerId !== session.originContainerId || draggedIdx === -1) return map
			for (let i = draggedIdx + 1; i < allItems.length; i++) {
				const id = getId(allItems[i])
				if (id && id !== draggedId) map.set(id, delta(allItems[i], allItems[i - 1]))
			}
			return map
		}

		if (preview.containerId === containerId) {
			const pos = preview.position

			if (draggedIdx === -1) {
				// Cross-container target: items from pos onwards shift forward by 1 slot
				for (let i = pos; i < allItems.length; i++) {
					const id = getId(allItems[i])
					if (!id || id === draggedId) continue
					const d = i + 1 < allItems.length
						? delta(allItems[i], allItems[i + 1])
						: fallbackDelta(allItems[i], 1)
					map.set(id, d)
				}
			} else {
				// Same-container reorder
				const targetIdx = pos <= draggedIdx ? pos : pos + 1
				for (let i = 0; i < allItems.length; i++) {
					const id = getId(allItems[i])
					if (!id || id === draggedId) continue
					if (i < draggedIdx && i >= targetIdx) {
						// Shift forward to make room
						map.set(id, delta(allItems[i], allItems[i + 1]))
					} else if (i > draggedIdx && i < targetIdx) {
						// Shift backward to fill gap
						map.set(id, delta(allItems[i], allItems[i - 1]))
					}
				}
			}
		} else if (containerId === session.originContainerId) {
			// Origin container: collapse gap
			if (draggedIdx !== -1) {
				for (let i = draggedIdx + 1; i < allItems.length; i++) {
					const id = getId(allItems[i])
					if (id && id !== draggedId) map.set(id, delta(allItems[i], allItems[i - 1]))
				}
			}
		}

		return map
	}

	// --- Zone calculation helpers ---

	private createEmptyZone(containerId: string, containerRect: DOMRect, direction: string): DropZone[] {
		return [{
			containerId,
			position: 0,
			direction: direction as DropZone['direction'],
			rect: {
				x: containerRect.left,
				y: containerRect.top,
				width: containerRect.width,
				height: Math.max(containerRect.height, 20)
			}
		}]
	}

	private createVerticalZones(containerId: string, containerRect: DOMRect, items: HTMLElement[]): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfHeight = itemRect.height / 2

			if (index === 0) {
				zones.push({
					containerId,
					position: 0,
					direction: 'vertical',
					rect: {
						x: containerRect.left,
						y: Math.min(containerRect.top, itemRect.top),
						width: containerRect.width,
						height: Math.max(halfHeight, itemRect.top - containerRect.top + halfHeight)
					}
				})
			}

			const nextItem = items[index + 1]
			const zoneY = itemRect.top + halfHeight
			let zoneHeight = halfHeight

			if (nextItem) {
				const nextItemRect = DOMHelper.getRect(nextItem)
				zoneHeight = halfHeight + (nextItemRect.top - itemRect.bottom) + nextItemRect.height / 2
			} else {
				zoneHeight = Math.max(halfHeight, containerRect.bottom - zoneY)
			}

			zones.push({
				containerId,
				position: index + 1,
				direction: 'vertical',
				rect: { x: containerRect.left, y: zoneY, width: containerRect.width, height: zoneHeight }
			})
		})

		return zones
	}

	private createHorizontalZones(containerId: string, containerRect: DOMRect, items: HTMLElement[]): DropZone[] {
		const zones: DropZone[] = []

		items.forEach((item, index) => {
			const itemRect = DOMHelper.getRect(item)
			const halfWidth = itemRect.width / 2

			if (index === 0) {
				zones.push({
					containerId,
					position: 0,
					direction: 'horizontal',
					rect: {
						x: Math.min(containerRect.left, itemRect.left),
						y: containerRect.top,
						width: Math.max(halfWidth, itemRect.left - containerRect.left + halfWidth),
						height: containerRect.height
					}
				})
			}

			const nextItem = items[index + 1]
			const zoneX = itemRect.left + halfWidth
			let zoneWidth = halfWidth

			if (nextItem) {
				const nextItemRect = DOMHelper.getRect(nextItem)
				zoneWidth = halfWidth + (nextItemRect.left - itemRect.right) + nextItemRect.width / 2
			} else {
				zoneWidth = Math.max(halfWidth, containerRect.right - zoneX)
			}

			zones.push({
				containerId,
				position: index + 1,
				direction: 'horizontal',
				rect: { x: zoneX, y: containerRect.top, width: zoneWidth, height: containerRect.height }
			})
		})

		return zones
	}

	private createGridZones(containerId: string, containerRect: DOMRect, items: HTMLElement[]): DropZone[] {
		const zones: DropZone[] = []
		const rows = this.groupItemsIntoRows(items)
		let positionIndex = 0

		rows.forEach((row, rowIndex) => {
			const nextRow = rows[rowIndex + 1]

			row.forEach((item, colIndex) => {
				const itemRect = DOMHelper.getRect(item)
				const halfWidth = itemRect.width / 2
				const halfHeight = itemRect.height / 2

				const zoneTop = rowIndex === 0
					? Math.min(containerRect.top, itemRect.top)
					: itemRect.top - halfHeight
				const zoneBottom = nextRow
					? itemRect.bottom + (DOMHelper.getRect(nextRow[0]).top - itemRect.bottom) / 2
					: Math.max(containerRect.bottom, itemRect.bottom)

				if (colIndex === 0) {
					zones.push({
						containerId,
						position: positionIndex,
						direction: 'grid',
						rect: {
							x: Math.min(containerRect.left, itemRect.left),
							y: zoneTop,
							width: itemRect.left + halfWidth - Math.min(containerRect.left, itemRect.left),
							height: zoneBottom - zoneTop
						}
					})
					positionIndex++
				}

				const nextItem = row[colIndex + 1]
				const zoneLeft = itemRect.left + halfWidth
				const zoneRight = nextItem
					? DOMHelper.getRect(nextItem).left + DOMHelper.getRect(nextItem).width / 2
					: Math.max(containerRect.right, itemRect.right)

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
		let currentRow = [items[0]]
		let currentRowTop = DOMHelper.getRect(items[0]).top

		for (let i = 1; i < items.length; i++) {
			const rect = DOMHelper.getRect(items[i])
			if (Math.abs(rect.top - currentRowTop) < rect.height * 0.5) {
				currentRow.push(items[i])
			} else {
				rows.push(currentRow)
				currentRow = [items[i]]
				currentRowTop = rect.top
			}
		}
		rows.push(currentRow)
		return rows
	}
}
