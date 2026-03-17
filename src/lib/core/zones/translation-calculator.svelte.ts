import type { DndState } from '../dnd/dnd-state.svelte.js'
import { DOMHelper } from '../utils/dom-helper.js'

export class TranslationCalculator {
	constructor(private state: DndState) {}

	translations = $derived.by((): Map<string, { x: number; y: number }> => {
		const map = new Map<string, { x: number; y: number }>()

		if (!this.state.dragging) return map

		const draggedId = this.state.draggedItem

		if (!this.state.dropPreview?.visible) {
			// No preview visible: collapse the gap left by the invisible dragged element
			const originContainerId = this.state.originContainerId
			if (!originContainerId || !draggedId) return map

			const originContainer = DOMHelper.findContainer(originContainerId)
			if (!originContainer) return map

			const direction = (originContainer.getAttribute('data-dnd-direction') ?? 'vertical') as
				| 'vertical'
				| 'horizontal'

			const slotSize = this.state.dragSlotSize
			if (!slotSize) return map

			const size = direction === 'horizontal' ? slotSize.width : slotSize.height
			if (size === 0) return map

			const allItems = DOMHelper.findDraggableItemsInContainer(originContainer)
			const draggedIdx = allItems.findIndex(el => el.getAttribute('data-dnd-drag-id') === draggedId)
			if (draggedIdx === -1) return map

			for (const el of allItems) {
				const id = el.getAttribute('data-dnd-drag-id')
				if (!id || id === draggedId) continue

				const myIdx = allItems.indexOf(el)
				if (myIdx > draggedIdx) {
					map.set(id, direction === 'horizontal' ? { x: -size, y: 0 } : { x: 0, y: -size })
				}
			}

			return map
		}

		const preview = this.state.dropPreview

		const targetContainer = DOMHelper.findContainer(preview.containerId)
		if (!targetContainer) return map

		// Target-mode containers are not sorted lists — don't translate any items
		if (targetContainer.getAttribute('data-dnd-mode') === 'target') {
			// Still collapse the gap in the origin container
			const originContainerId = this.state.originContainerId
			if (originContainerId && originContainerId !== preview.containerId) {
				const originContainer = DOMHelper.findContainer(originContainerId)
				if (originContainer) {
					const originDirection = (originContainer.getAttribute('data-dnd-direction') ?? 'vertical') as 'vertical' | 'horizontal'
					const slotSize = this.state.dragSlotSize
					if (slotSize) {
						const originSize = originDirection === 'horizontal' ? slotSize.width : slotSize.height
						const originItems = DOMHelper.findDraggableItemsInContainer(originContainer)
						const draggedId = this.state.draggedItem
						const originDraggedIdx = originItems.findIndex(el => el.getAttribute('data-dnd-drag-id') === draggedId)
						if (originDraggedIdx !== -1) {
							for (const el of originItems) {
								const id = el.getAttribute('data-dnd-drag-id')
								if (!id || id === draggedId) continue
								if (originItems.indexOf(el) > originDraggedIdx) {
									map.set(id, originDirection === 'horizontal' ? { x: -originSize, y: 0 } : { x: 0, y: -originSize })
								}
							}
						}
					}
				}
			}
			return map
		}

		const direction = (targetContainer.getAttribute('data-dnd-direction') ?? 'vertical') as
			| 'vertical'
			| 'horizontal'

		const slotSize = this.state.dragSlotSize
		const elementSize = direction === 'horizontal'
			? (preview.draggedElementWidth ?? 0)
			: (preview.draggedElementHeight ?? 0)
		const size = slotSize
			? (direction === 'horizontal' ? slotSize.width : slotSize.height)
			: elementSize

		if (size === 0) return map

		const allItems = DOMHelper.findDraggableItemsInContainer(targetContainer)

		const draggedIdx = allItems.findIndex(el => el.getAttribute('data-dnd-drag-id') === draggedId)
		const pos = preview.position

		for (const el of allItems) {
			const id = el.getAttribute('data-dnd-drag-id')
			if (!id || id === draggedId) continue

			const myIdx = allItems.indexOf(el)

			let offset = 0

			if (draggedIdx === -1) {
				// Cross-container: shift items from pos onwards
				offset = myIdx >= pos ? size : 0
			} else {
				// Same container reorder
				const targetIdx = pos <= draggedIdx ? pos : pos + 1
				if (myIdx < draggedIdx && myIdx >= targetIdx) offset = size
				else if (myIdx > draggedIdx && myIdx < targetIdx) offset = -size
			}

			if (offset !== 0) {
				map.set(id, direction === 'horizontal' ? { x: offset, y: 0 } : { x: 0, y: offset })
			}
		}

		// Cross-container: also collapse the gap in the origin container
		if (draggedIdx === -1) {
			const originContainerId = this.state.originContainerId
			if (originContainerId && originContainerId !== preview.containerId) {
				const originContainer = DOMHelper.findContainer(originContainerId)
				if (originContainer) {
					const originDirection = (originContainer.getAttribute('data-dnd-direction') ?? 'vertical') as
						| 'vertical'
						| 'horizontal'
					const slotSize = this.state.dragSlotSize
					if (slotSize) {
						const originSize = originDirection === 'horizontal' ? slotSize.width : slotSize.height
						const originItems = DOMHelper.findDraggableItemsInContainer(originContainer)
						const originDraggedIdx = originItems.findIndex(el => el.getAttribute('data-dnd-drag-id') === draggedId)
						if (originDraggedIdx !== -1) {
							for (const el of originItems) {
								const id = el.getAttribute('data-dnd-drag-id')
								if (!id || id === draggedId) continue
								const myIdx = originItems.indexOf(el)
								if (myIdx > originDraggedIdx) {
									map.set(id, originDirection === 'horizontal' ? { x: -originSize, y: 0 } : { x: 0, y: -originSize })
								}
							}
						}
					}
				}
			}
		}

		return map
	})
}
