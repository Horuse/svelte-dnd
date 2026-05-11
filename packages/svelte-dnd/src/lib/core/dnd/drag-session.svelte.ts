import type { DropPreview } from '../../types.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { SortableSource } from '../zones/sortable-source.js'

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

	private sources = new Map<string, SortableSource>()

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

	/**
	 * Register a strategy-owned geometry source for a container. Called from
	 * `ContainerStrategy.onSessionStart`, before any reactive translations are
	 * applied to slot elements.
	 */
	setSource(containerId: string, source: SortableSource): void {
		this.sources.set(containerId, source)
	}

	getSource(containerId: string): SortableSource | undefined {
		return this.sources.get(containerId)
	}

	// --- Derived accessors ---

	get itemId() {
		return this.source.id
	}
	get element() {
		return this.source.element
	}
	get itemData() {
		return this.source.data
	}
	get draggedItemType() {
		return this.source.type ?? null
	}
	get originContainerId() {
		return this.sourceContainer.id
	}
	get originPosition() {
		return this.source.slot?.position ?? 0
	}
	get originalPosition() {
		return { x: this.startRect.left, y: this.startRect.top }
	}
}
