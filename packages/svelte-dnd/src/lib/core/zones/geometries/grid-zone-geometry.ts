import type { DropZone } from '../../../types.js'
import type { SlotLayoutRect } from '../layout-snapshot.js'
import type { ZoneGeometry, ZoneGeometryContext } from '../zone-geometry.js'

export type GridFlow = 'row' | 'column'

/**
 * Zone geometry for 2D grid layouts.
 *
 * `flow: 'row'` (default): items fill left-to-right, wrapping to next row.
 * `flow: 'column'`: items fill top-to-bottom, wrapping to next column.
 *
 * Items are grouped along the secondary (wrap) axis using the captured snapshot,
 * then each item is split into two halves along the primary axis — one for
 * "insert before me", one for "insert after me".
 */
export class GridZoneGeometry implements ZoneGeometry {
	constructor(private flow: GridFlow = 'row') {}

	buildZones(visibleRects: SlotLayoutRect[], ctx: ZoneGeometryContext): DropZone[] {
		if (visibleRects.length === 0) return [this.buildEmptyZone(ctx)]

		const ax = axisFor(this.flow)
		const groups = groupByTrack(visibleRects, ax)
		const zones: DropZone[] = []
		const beforePos = (rect: SlotLayoutRect) =>
			ctx.draggedIndex !== -1 && rect.position > ctx.draggedIndex
				? rect.position - 1
				: rect.position

		for (let gi = 0; gi < groups.length; gi++) {
			const group = groups[gi]
			const prevGroup = groups[gi - 1]
			const nextGroup = groups[gi + 1]

			const trackStart = Math.min(...group.map((r) => ax.secondaryOf(r)))
			const trackEnd = Math.max(...group.map((r) => ax.secondaryOf(r) + ax.secondarySizeOf(r)))

			const secStart = prevGroup
				? (Math.max(...prevGroup.map((r) => ax.secondaryOf(r) + ax.secondarySizeOf(r))) + trackStart) / 2
				: Math.min(0, trackStart)
			const secEnd = nextGroup
				? (trackEnd + Math.min(...nextGroup.map((r) => ax.secondaryOf(r)))) / 2
				: Math.max(ax.containerSecondaryLength(ctx) + ax.scrollSecondary(ctx), trackEnd)

			for (let ii = 0; ii < group.length; ii++) {
				const rect = group[ii]
				const prev = group[ii - 1]
				const next = group[ii + 1]
				const before = beforePos(rect)

				const primaryStart = ax.primaryOf(rect)
				const primarySize = ax.primarySizeOf(rect)
				const primaryMid = primaryStart + primarySize / 2

				const beforeStart = prev
					? (ax.primaryOf(prev) + ax.primarySizeOf(prev) + primaryStart) / 2
					: Math.min(0, primaryStart)
				zones.push(ax.toZone(ctx, before, beforeStart, primaryMid, secStart, secEnd))

				const afterEnd = next
					? (primaryStart + primarySize + ax.primaryOf(next)) / 2
					: Math.max(ax.containerPrimaryLength(ctx) + ax.scrollPrimary(ctx), primaryStart + primarySize)
				zones.push(ax.toZone(ctx, before + 1, primaryMid, afterEnd, secStart, secEnd))
			}
		}

		return zones
	}

	buildEmptyZone(ctx: ZoneGeometryContext): DropZone {
		return {
			containerId: ctx.containerId,
			position: 0,
			layout: 'grid',
			rect: {
				x: ctx.containerRect.left,
				y: ctx.containerRect.top,
				width: ctx.containerRect.width,
				height: Math.max(ctx.containerRect.height, 20)
			}
		}
	}
}

/**
 * Axis abstraction lets the grouping + zone-splitting logic stay symmetric
 * across `flow: 'row'` (primary = X, secondary = Y) and `flow: 'column'`
 * (primary = Y, secondary = X).
 */
interface AxisMapping {
	primaryOf(r: SlotLayoutRect): number
	secondaryOf(r: SlotLayoutRect): number
	primarySizeOf(r: SlotLayoutRect): number
	secondarySizeOf(r: SlotLayoutRect): number
	containerPrimaryLength(ctx: ZoneGeometryContext): number
	containerSecondaryLength(ctx: ZoneGeometryContext): number
	scrollPrimary(ctx: ZoneGeometryContext): number
	scrollSecondary(ctx: ZoneGeometryContext): number
	toZone(
		ctx: ZoneGeometryContext,
		position: number,
		primaryStart: number,
		primaryEnd: number,
		secondaryStart: number,
		secondaryEnd: number
	): DropZone
}

function axisFor(flow: GridFlow): AxisMapping {
	if (flow === 'row') {
		return {
			primaryOf: (r) => r.offsetLeft,
			secondaryOf: (r) => r.offsetTop,
			primarySizeOf: (r) => r.width,
			secondarySizeOf: (r) => r.height,
			containerPrimaryLength: (ctx) => ctx.containerRect.width,
			containerSecondaryLength: (ctx) => ctx.containerRect.height,
			scrollPrimary: (ctx) => ctx.scrollLeft,
			scrollSecondary: (ctx) => ctx.scrollTop,
			toZone: (ctx, position, pStart, pEnd, sStart, sEnd) => ({
				containerId: ctx.containerId,
				position,
				layout: 'grid',
				rect: {
					x: pStart + ctx.containerRect.left - ctx.scrollLeft,
					y: sStart + ctx.containerRect.top - ctx.scrollTop,
					width: pEnd - pStart,
					height: sEnd - sStart
				}
			})
		}
	}
	// column
	return {
		primaryOf: (r) => r.offsetTop,
		secondaryOf: (r) => r.offsetLeft,
		primarySizeOf: (r) => r.height,
		secondarySizeOf: (r) => r.width,
		containerPrimaryLength: (ctx) => ctx.containerRect.height,
		containerSecondaryLength: (ctx) => ctx.containerRect.width,
		scrollPrimary: (ctx) => ctx.scrollTop,
		scrollSecondary: (ctx) => ctx.scrollLeft,
		toZone: (ctx, position, pStart, pEnd, sStart, sEnd) => ({
			containerId: ctx.containerId,
			position,
			layout: 'grid',
			rect: {
				x: sStart + ctx.containerRect.left - ctx.scrollLeft,
				y: pStart + ctx.containerRect.top - ctx.scrollTop,
				width: sEnd - sStart,
				height: pEnd - pStart
			}
		})
	}
}

/**
 * Group rects into tracks along the secondary axis. A track is a set of rects
 * whose secondary position overlaps (same row in flow=row, same column in flow=column).
 */
function groupByTrack(rects: SlotLayoutRect[], ax: AxisMapping): SlotLayoutRect[][] {
	if (rects.length === 0) return []
	const groups: SlotLayoutRect[][] = []
	let current: SlotLayoutRect[] = [rects[0]]
	let trackStart = ax.secondaryOf(rects[0])

	for (let i = 1; i < rects.length; i++) {
		const r = rects[i]
		if (Math.abs(ax.secondaryOf(r) - trackStart) < ax.secondarySizeOf(r) * 0.5) {
			current.push(r)
		} else {
			groups.push(current)
			current = [r]
			trackStart = ax.secondaryOf(r)
		}
	}
	groups.push(current)
	return groups
}
