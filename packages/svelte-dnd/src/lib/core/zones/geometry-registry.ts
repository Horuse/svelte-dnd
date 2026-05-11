import type { DndLayout } from '../../types.js'
import type { ZoneGeometry } from './zone-geometry.js'
import { AxisZoneGeometry } from './geometries/axis-zone-geometry.js'
import { GridZoneGeometry, type GridFlow } from './geometries/grid-zone-geometry.js'

const VERTICAL_GEOMETRY: ZoneGeometry = new AxisZoneGeometry('vertical')
const HORIZONTAL_GEOMETRY: ZoneGeometry = new AxisZoneGeometry('horizontal')
const GRID_ROW_GEOMETRY: ZoneGeometry = new GridZoneGeometry('row')
const GRID_COLUMN_GEOMETRY: ZoneGeometry = new GridZoneGeometry('column')

export function pickGeometry(layout: DndLayout, flow: GridFlow = 'row'): ZoneGeometry {
	if (layout === 'grid') return flow === 'column' ? GRID_COLUMN_GEOMETRY : GRID_ROW_GEOMETRY
	if (layout === 'horizontal') return HORIZONTAL_GEOMETRY
	return VERTICAL_GEOMETRY
}
