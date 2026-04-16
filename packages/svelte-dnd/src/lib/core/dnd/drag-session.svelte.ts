import type { DropPreview } from '../../types.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'

export type DragSource = 'user' | 'programmatic'

export class DragSession {
	source: Draggable
	sourceContainer: Droppable
	startRect: DOMRect
	dragSource: DragSource

	ghostTransform = $state({ x: 0, y: 0 })
	dropPreview = $state<DropPreview | null>(null)
	ghostSize = $state<{ width: number; height: number }>({ width: 0, height: 0 })
	slotSize = $state<{ width: number; height: number } | null>(null)

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
		this.ghostTransform = initialTransform
		this.dragSource = dragSource
		this.ghostSize = { width: source.element.offsetWidth, height: source.element.offsetHeight }
		this.slotSize = source.slot ? source.slot.getSize() : null
	}

	// --- Derived accessors ---

	get itemId() { return this.source.id }
	get element() { return this.source.element }
	get itemData() { return this.source.data }
	get draggedItemType() { return this.source.type ?? null }
	get originContainerId() { return this.sourceContainer.id }
	get originPosition() { return this.source.slot?.position ?? 0 }
	get originalPosition() { return { x: this.startRect.left, y: this.startRect.top } }
}
