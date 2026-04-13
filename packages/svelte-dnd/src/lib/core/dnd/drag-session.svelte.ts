import type { DropPreview } from '../../types.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'

export type DragSource = 'user' | 'programmatic'

export class DragSession {
	// Source (immutable after creation)
	source: Draggable
	sourceContainer: Droppable
	startRect: DOMRect
	dragSource: DragSource

	// Current state (reactive)
	transform = $state({ x: 0, y: 0 })
	currentTarget = $state<Droppable | null>(null)
	previewPosition = $state<number | null>(null)

	constructor(
		source: Draggable,
		sourceContainer: Droppable,
		startRect: DOMRect,
		initialTransform: { x: number; y: number },
		dragSource: DragSource = 'user'
	) {
		this.source = source
		this.sourceContainer = sourceContainer
		this.startRect = startRect
		this.transform = initialTransform
		this.dragSource = dragSource
	}

	// --- Derived (backward compatibility with old DragSession/DndState API) ---

	get itemId() { return this.source.id }
	get element() { return this.source.element }
	get itemData() { return this.source.data }
	get draggedItemType() { return this.source.type ?? null }
	get originContainerId() { return this.sourceContainer.id }
	get originPosition() { return this.source.slot.position }
	get originalPosition() { return { x: this.startRect.left, y: this.startRect.top } }
	get ghostTransform() { return this.transform }
	get ghostSize() {
		return {
			width: this.source.element.offsetWidth,
			height: this.source.element.offsetHeight
		}
	}
	get slotSize() { return this.source.slot.getSize() }

	get dropPreview(): DropPreview | null {
		if (!this.currentTarget || this.previewPosition === null) return null
		return {
			containerId: this.currentTarget.id,
			position: this.previewPosition,
			visible: true,
			draggedElementHeight: this.source.element.offsetHeight,
			draggedElementWidth: this.source.element.offsetWidth
		}
	}

	get hasValidTarget(): boolean { return this.currentTarget !== null }
}
