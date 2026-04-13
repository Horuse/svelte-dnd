import type { DropZone } from '../../types.js'
import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import { centerPoint } from '../collision/center-point.js'
import { DOMHelper } from '../utils/dom-helper.js'

/**
 * Resolves which drop zone contains a given point during an active drag.
 * Uses pluggable collision algorithms with the following priority:
 * 1. Per-container algorithm (from droppable entity)
 * 2. Global algorithm (passed to constructor)
 * 3. centerPoint (default)
 */
export class DropResolver {
	constructor(
		private state: DndState,
		private droppablesById: Map<string, Droppable>,
		private globalAlgorithm?: CollisionAlgorithm
	) {}

	/** All zones filtered to only those that accept the currently dragged item type. */
	get filteredZones(): DropZone[] {
		return this.filterZonesByType(this.state.zones)
	}

	findZoneAt(point: { x: number; y: number }): DropZone | null {
		const draggedItemId = this.state.draggedItem
		if (!draggedItemId) return null

		const filteredZones = this.filterZonesByType(this.state.zones)
		const ghost = this.getGhostRect()

		for (const zone of filteredZones) {
			const droppable = this.droppablesById.get(zone.containerId)
			const algorithm = droppable?.collision ?? this.globalAlgorithm ?? centerPoint

			const hit = algorithm({ zones: [zone], pointer: point, ghost })
			if (hit) return hit
		}

		return null
	}

	private filterZonesByType(zones: DropZone[]): DropZone[] {
		const draggedType = this.state.draggedType
		if (!draggedType) return zones

		return zones.filter((zone) => {
			const droppable = this.droppablesById.get(zone.containerId)
			const accepts = droppable?.accepts
			if (!accepts) return true
			if (Array.isArray(accepts)) return accepts.includes(draggedType)
			return accepts === draggedType
		})
	}

	private getGhostRect(): { x: number; y: number; width: number; height: number } {
		const transform = this.state.transform
		const size = this.state.size
		return {
			x: transform?.x ?? 0,
			y: transform?.y ?? 0,
			width: size?.width ?? 0,
			height: size?.height ?? 0
		}
	}
}
