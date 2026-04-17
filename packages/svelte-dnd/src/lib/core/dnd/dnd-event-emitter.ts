import type {
	DragStartCallback, DragEndCallback, DropCallback, DragOverCallback,
	DropCancelledCallback, ZonesInvalidatedCallback,
	DragStartEvent, DragEndEvent, DropEvent, DragOverEvent, DropCancelledEvent
} from '../../types.js'

export class DndEventEmitter {
	private dragStartCallbacks = new Set<DragStartCallback>()
	private dragEndCallbacks = new Set<DragEndCallback>()
	private dropCallbacks = new Set<DropCallback>()
	private dragOverCallbacks = new Set<DragOverCallback>()
	private dropCancelledCallbacks = new Set<DropCancelledCallback>()
	private zonesInvalidatedCallbacks = new Set<ZonesInvalidatedCallback>()

	onDragStart(cb: DragStartCallback): () => void {
		this.dragStartCallbacks.add(cb)
		return () => { this.dragStartCallbacks.delete(cb) }
	}

	onDragEnd(cb: DragEndCallback): () => void {
		this.dragEndCallbacks.add(cb)
		return () => { this.dragEndCallbacks.delete(cb) }
	}

	onDrop(cb: DropCallback): () => void {
		this.dropCallbacks.add(cb)
		return () => { this.dropCallbacks.delete(cb) }
	}

	onDragOver(cb: DragOverCallback): () => void {
		this.dragOverCallbacks.add(cb)
		return () => { this.dragOverCallbacks.delete(cb) }
	}

	onDropCancelled(cb: DropCancelledCallback): () => void {
		this.dropCancelledCallbacks.add(cb)
		return () => { this.dropCancelledCallbacks.delete(cb) }
	}

	notifyDragStart(event: DragStartEvent) {
		this.dragStartCallbacks.forEach(cb => cb(event))
	}

	notifyDragEnd(event: DragEndEvent) {
		this.dragEndCallbacks.forEach(cb => cb(event))
	}

	notifyDrop(event: DropEvent) {
		this.dropCallbacks.forEach(cb => cb(event))
	}

	notifyDragOver(event: DragOverEvent) {
		this.dragOverCallbacks.forEach(cb => cb(event))
	}

	notifyDropCancelled(event: DropCancelledEvent) {
		this.dropCancelledCallbacks.forEach(cb => cb(event))
	}

	onZonesInvalidated(cb: ZonesInvalidatedCallback): () => void {
		this.zonesInvalidatedCallbacks.add(cb)
		return () => { this.zonesInvalidatedCallbacks.delete(cb) }
	}

	notifyZonesInvalidated() {
		this.zonesInvalidatedCallbacks.forEach(cb => cb())
	}

	destroy() {
		this.dragStartCallbacks.clear()
		this.dragEndCallbacks.clear()
		this.dropCallbacks.clear()
		this.dragOverCallbacks.clear()
		this.dropCancelledCallbacks.clear()
		this.zonesInvalidatedCallbacks.clear()
	}
}
