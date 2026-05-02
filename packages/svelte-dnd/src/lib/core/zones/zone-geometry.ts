import type { DropZone } from '../../types.js'
import type { SlotLayoutRect } from './layout-snapshot.js'

export interface ZoneGeometryContext {
	containerId: string
	containerRect: DOMRect
	scrollLeft: number
	scrollTop: number
	/**
	 * Index of the dragged item inside the captured snapshot, or -1 when the
	 * drag originated in a different container. Geometries use it to translate
	 * a slot's full-array `position` into its `splice`-target position in the
	 * array-without-dragged that drop handlers consume.
	 */
	draggedIndex: number
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
