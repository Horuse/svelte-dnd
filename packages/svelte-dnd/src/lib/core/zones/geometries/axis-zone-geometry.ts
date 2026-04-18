import type { DropZone, DndDirection } from '../../../types.js'
import type { SlotLayoutRect } from '../layout-snapshot.js'
import type { ZoneGeometry, ZoneGeometryContext } from '../zone-geometry.js'

type Axis = 'vertical' | 'horizontal'

/**
 * Zone geometry for single-axis layouts (vertical / horizontal lists).
 * Each item contributes two half-rect zones: one for "insert before me",
 * one for "insert after me". Adjacent halves belong to neighbouring positions.
 */
export class AxisZoneGeometry implements ZoneGeometry {
	constructor(private axis: Axis) {}

	buildZones(visibleRects: SlotLayoutRect[], ctx: ZoneGeometryContext): DropZone[] {
		if (visibleRects.length === 0) return [this.buildEmptyZone(ctx)]

		const zones: DropZone[] = []
		const direction: DndDirection = this.axis

		visibleRects.forEach((rect, index) => {
			const viewport = this.toViewport(rect, ctx)

			if (this.axis === 'vertical') {
				const halfHeight = viewport.height / 2

				if (index === 0) {
					zones.push({
						containerId: ctx.containerId,
						position: 0,
						direction,
						rect: {
							x: ctx.containerRect.left,
							y: Math.min(ctx.containerRect.top, viewport.y),
							width: ctx.containerRect.width,
							height: Math.max(halfHeight, viewport.y - ctx.containerRect.top + halfHeight)
						}
					})
				}

				const next = visibleRects[index + 1]
				const zoneY = viewport.y + halfHeight
				let zoneHeight = halfHeight

				if (next) {
					const nextViewport = this.toViewport(next, ctx)
					zoneHeight = halfHeight + (nextViewport.y - (viewport.y + viewport.height)) + nextViewport.height / 2
				} else {
					zoneHeight = Math.max(halfHeight, ctx.containerRect.bottom - zoneY)
				}

				zones.push({
					containerId: ctx.containerId,
					position: index + 1,
					direction,
					rect: { x: ctx.containerRect.left, y: zoneY, width: ctx.containerRect.width, height: zoneHeight }
				})
			} else {
				const halfWidth = viewport.width / 2

				if (index === 0) {
					zones.push({
						containerId: ctx.containerId,
						position: 0,
						direction,
						rect: {
							x: Math.min(ctx.containerRect.left, viewport.x),
							y: ctx.containerRect.top,
							width: Math.max(halfWidth, viewport.x - ctx.containerRect.left + halfWidth),
							height: ctx.containerRect.height
						}
					})
				}

				const next = visibleRects[index + 1]
				const zoneX = viewport.x + halfWidth
				let zoneWidth = halfWidth

				if (next) {
					const nextViewport = this.toViewport(next, ctx)
					zoneWidth = halfWidth + (nextViewport.x - (viewport.x + viewport.width)) + nextViewport.width / 2
				} else {
					zoneWidth = Math.max(halfWidth, ctx.containerRect.right - zoneX)
				}

				zones.push({
					containerId: ctx.containerId,
					position: index + 1,
					direction,
					rect: { x: zoneX, y: ctx.containerRect.top, width: zoneWidth, height: ctx.containerRect.height }
				})
			}
		})

		return zones
	}

	buildEmptyZone(ctx: ZoneGeometryContext): DropZone {
		return {
			containerId: ctx.containerId,
			position: 0,
			direction: this.axis,
			rect: {
				x: ctx.containerRect.left,
				y: ctx.containerRect.top,
				width: ctx.containerRect.width,
				height: Math.max(ctx.containerRect.height, 20)
			}
		}
	}

	private toViewport(rect: SlotLayoutRect, ctx: ZoneGeometryContext) {
		return {
			x: rect.offsetLeft + ctx.containerRect.left - ctx.scrollLeft,
			y: rect.offsetTop + ctx.containerRect.top - ctx.scrollTop,
			width: rect.width,
			height: rect.height
		}
	}
}
