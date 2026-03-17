import type { DragStartCallback, DragEndCallback, DropCallback, ZonesInvalidatedCallback } from '../types.js'

export class DragEventEmitter {
	private dragStartCallbacks = new Set<DragStartCallback>()
	private dragEndCallbacks = new Set<DragEndCallback>()
	private dropCallbacks = new Set<DropCallback>()
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

	notifyDragStart(itemId: string) {
		this.dragStartCallbacks.forEach(cb => cb(itemId))
	}

	notifyDragEnd(itemId: string) {
		this.dragEndCallbacks.forEach(cb => cb(itemId))
	}

	notifyDrop(sourceId: string, sourceData: any, targetContainerId: string, position: number) {
		this.dropCallbacks.forEach(cb => cb(sourceId, sourceData, targetContainerId, position))
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
		this.zonesInvalidatedCallbacks.clear()
	}
}
