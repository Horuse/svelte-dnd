import type { DropZone } from '../../types.js'
import type { SlotLayoutRect } from './layout-snapshot.js'

export interface ZoneGeometryContext {
	containerId: string
	containerRect: DOMRect
	scrollLeft: number
	scrollTop: number
}

/**
 * Builds drop zones from a layout snapshot. A zone geometry only decides
 * the SHAPE of collision rects for each insertion position — drop logic
 * (translations, splice math) is direction-agnostic and lives elsewhere.
 *
 * Adding a new layout (masonry, square, …) means adding a new implementation,
 * not touching SortableContainerStrategy.
 */
export interface ZoneGeometry {
	buildZones(
		visibleRects: SlotLayoutRect[],
		context: ZoneGeometryContext
	): DropZone[]

	buildEmptyZone(context: ZoneGeometryContext): DropZone
}
