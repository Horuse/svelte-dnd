import type { DragStartCallback, DragEndCallback, DropCallback, DragOverCallback, DropCancelledCallback, ZonesInvalidatedCallback } from '../../types.js'

export class DndEventEmitter {
	private dragStartCallbacks = new Set<DragStartCallback>()
	private dragEndCallbacks = new Set<DragEndCallback>()
	private dropCallbacks = new Set<DropCallback>()
	private dragOverCallbacks = new Set<DragOverCallback>()
	private dropCancelledCallbacks = new Set<DropCancelledCallback>()
	private zonesInvalidatedCallbacks = new Set<ZonesInvalidatedCallback>()

	onDragStart(cb: DragStartCallback) {
		this.dragStartCallbacks.add(cb)
		return () => this.dragStartCallbacks.delete(cb)
	}

	onDragEnd(cb: DragEndCallback) {
		this.dragEndCallbacks.add(cb)
		return () => this.dragEndCallbacks.delete(cb)
	}

	onDrop(cb: DropCallback) {
		this.dropCallbacks.add(cb)
		return () => this.dropCallbacks.delete(cb)
	}

	onDragOver(cb: DragOverCallback) {
		this.dragOverCallbacks.add(cb)
		return () => this.dragOverCallbacks.delete(cb)
	}

	onDropCancelled(cb: DropCancelledCallback) {
		this.dropCancelledCallbacks.add(cb)
		return () => this.dropCancelledCallbacks.delete(cb)
	}

	notifyDragStart(itemId: string) {
		this.dragStartCallbacks.forEach(cb => cb(itemId))
	}

	notifyDragEnd(itemId: string) {
		this.dragEndCallbacks.forEach(cb => cb(itemId))
	}

	notifyDrop(sourceId: string, sourceData: Record<string, unknown> | undefined, targetContainerId: string, position: number) {
		this.dropCallbacks.forEach(cb => cb(sourceId, sourceData, targetContainerId, position))
	}

	notifyDragOver(sourceId: string, containerId: string, position: number, prevContainerId: string | null) {
		this.dragOverCallbacks.forEach(cb => cb(sourceId, containerId, position, prevContainerId))
	}

	notifyDropCancelled(itemId: string) {
		this.dropCancelledCallbacks.forEach(cb => cb(itemId))
	}

	onZonesInvalidated(cb: ZonesInvalidatedCallback) {
		this.zonesInvalidatedCallbacks.add(cb)
		return () => this.zonesInvalidatedCallbacks.delete(cb)
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
