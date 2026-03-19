import type { DropZone } from '../../types.js'
import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { ContainerRegistry } from '../containers/container-registry.js'
import { DOMHelper } from '../utils/dom-helper.js'

/**
 * Resolves which drop zone contains a given point during an active drag.
 * Extracted from DropZoneCalculator for single-responsibility and testability.
 * Supports both center-point and overlap-based hit detection.
 */
export class DropResolver {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry
	) {}

	/** All zones filtered to only those that accept the currently dragged item type. */
	get filteredZones(): DropZone[] {
		return this.filterZonesByType(this.state.zones)
	}

	findZoneAt(point: { x: number; y: number }): DropZone | null {
		const draggedItemId = this.state.draggedItem
		if (!draggedItemId) return null

		const filteredZones = this.filterZonesByType(this.state.zones)

		for (const zone of filteredZones) {
			const container = DOMHelper.findContainer(zone.containerId)
			const overlapAttr = container?.getAttribute('data-dnd-overlap') ?? null

			if (overlapAttr !== null) {
				const threshold = this.parseOverlapThreshold(overlapAttr)
				if (this.isGhostOverlappingZone(zone, threshold) && this.isGhostOverlappingContainer(zone.containerId)) {
					return zone
				}
			} else {
				if (this.isPointInZone(point, zone) && this.isPointInContainer(point, zone.containerId)) {
					return zone
				}
			}
		}

		return null
	}

	private filterZonesByType(zones: DropZone[]): DropZone[] {
		const draggedType = this.state.draggedType
		if (!draggedType) return zones

		return zones.filter((zone) => {
			const data = this.registry.getData(zone.containerId)
			if (!data) return true
			const accepts = data.accepts || data.type
			if (!accepts) return true
			if (Array.isArray(accepts)) return accepts.includes(draggedType)
			return accepts === draggedType
		})
	}

	private parseOverlapThreshold(value: string): number {
		if (value.endsWith('%')) {
			const pct = parseFloat(value) / 100
			const size = this.state.size
			if (!size) return 0
			return pct * Math.min(size.width, size.height)
		}
		return parseFloat(value) || 0
	}

	private isGhostOverlappingZone(zone: DropZone, threshold: number): boolean {
		const transform = this.state.transform
		const size = this.state.size
		if (!transform || !size) return false

		const intersectW = Math.min(transform.x + size.width, zone.rect.x + zone.rect.width) - Math.max(transform.x, zone.rect.x)
		const intersectH = Math.min(transform.y + size.height, zone.rect.y + zone.rect.height) - Math.max(transform.y, zone.rect.y)

		return intersectW > threshold && intersectH > threshold
	}

	private isGhostOverlappingContainer(containerId: string): boolean {
		const containerElement = DOMHelper.findContainer(containerId)
		if (!containerElement) return true
		const transform = this.state.transform
		const size = this.state.size
		if (!transform || !size) return true

		const rect = DOMHelper.getRect(containerElement)
		const intersectW = Math.min(transform.x + size.width, rect.right) - Math.max(transform.x, rect.left)
		const intersectH = Math.min(transform.y + size.height, rect.bottom) - Math.max(transform.y, rect.top)

		return intersectW > 0 && intersectH > 0
	}

	private isPointInContainer(point: { x: number; y: number }, containerId: string): boolean {
		const containerElement = DOMHelper.findContainer(containerId)
		if (!containerElement) return true
		const rect = DOMHelper.getRect(containerElement)
		return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
	}

	private isPointInZone(point: { x: number; y: number }, zone: DropZone): boolean {
		return (
			point.x >= zone.rect.x &&
			point.x <= zone.rect.x + zone.rect.width &&
			point.y >= zone.rect.y &&
			point.y <= zone.rect.y + zone.rect.height
		)
	}
}
