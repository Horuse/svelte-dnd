import type { DropPreview } from '../../types.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { LayoutSnapshot } from '../zones/layout-snapshot.js'
import { captureLayoutSnapshot } from '../zones/layout-snapshot.js'

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

	private snapshots = new Map<string, LayoutSnapshot>()

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
	 * Capture a container's layout geometry. Must be called at drag start,
	 * before any reactive translations are applied to slot elements.
	 */
	captureSnapshot(droppable: Droppable): LayoutSnapshot {
		const snapshot = captureLayoutSnapshot(droppable, this.source.id)
		this.snapshots.set(droppable.id, snapshot)
		return snapshot
	}

	getSnapshot(containerId: string): LayoutSnapshot | undefined {
		return this.snapshots.get(containerId)
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
