import { describe, it, expect } from 'vitest'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'
import type { DragSession } from '../../src/lib/core/dnd/drag-session.svelte.js'
import type { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import type { LayoutSnapshot } from '../../src/lib/core/zones/layout-snapshot.js'
import { DomSortableSource } from '../../src/lib/core/zones/sortable-source.js'
import { scrollableEl, slotRect } from '../helpers/fixtures.js'

const droppableWith = (id: string, rect: { x: number; y: number; width: number; height: number }, scroll = { top: 0, left: 0 }) => {
	const element = scrollableEl(rect, scroll)
	return { id, element } as unknown as Droppable
}

const sessionWith = (snapshot: LayoutSnapshot, itemId = 'dragged'): DragSession => {
	const source = new DomSortableSource(snapshot, itemId)
	return {
		getSource: (id: string) => (id === snapshot.containerId ? source : undefined),
		itemId
	} as unknown as DragSession
}

describe('SortableContainerStrategy.calculateDropZones — scroll viewport clipping', () => {
	const strategy = sortable({ layout: 'vertical' })

	it('skips slots scrolled out of the container viewport', () => {
		// Container 200x400 at (0, 0). Items each 50 tall, 50 of them ⇒ content 2500.
		// scrollTop=0 ⇒ only items whose offsetTop < 400 are visible (≤ first 8).
		const rects = Array.from({ length: 50 }, (_, i) =>
			slotRect(`item-${i}`, i, 0, i * 50, 200, 50)
		)
		const snapshot: LayoutSnapshot = { containerId: 'list', rects, draggedIndex: -1 }
		const droppable = droppableWith('list', { x: 0, y: 0, width: 200, height: 400 })
		const session = sessionWith(snapshot, 'none')

		const zones = strategy.calculateDropZones(droppable, session)

		// 8 visible items (item-0..item-7) ⇒ 9 insert positions (0..8).
		// item-8 onward is clipped by overflow ⇒ no zones for them.
		const positions = zones.map((z) => z.position).sort((a, b) => a - b)
		expect(positions).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8])
	})

	it('does not emit zones below the visible container bottom', () => {
		const rects = Array.from({ length: 50 }, (_, i) =>
			slotRect(`item-${i}`, i, 0, i * 50, 200, 50)
		)
		const snapshot: LayoutSnapshot = { containerId: 'list', rects, draggedIndex: -1 }
		const droppable = droppableWith('list', { x: 0, y: 0, width: 200, height: 400 })
		const session = sessionWith(snapshot, 'none')

		const zones = strategy.calculateDropZones(droppable, session)

		// Bug guard: pointing at y=800 (well beyond container.bottom=400) must not fall
		// inside any drop zone — historically zones for scrolled-out slots leaked there.
		for (const zone of zones) {
			expect(zone.rect.y).toBeLessThan(400)
			expect(zone.rect.y + zone.rect.height).toBeLessThanOrEqual(400)
		}
	})

	it('shifts the visible window with scrollTop', () => {
		const rects = Array.from({ length: 50 }, (_, i) =>
			slotRect(`item-${i}`, i, 0, i * 50, 200, 50)
		)
		const snapshot: LayoutSnapshot = { containerId: 'list', rects, draggedIndex: -1 }
		// Scrolled to y=500 ⇒ content rows 10..17 become visible.
		const droppable = droppableWith('list', { x: 0, y: 0, width: 200, height: 400 }, { top: 500, left: 0 })
		const session = sessionWith(snapshot, 'none')

		const zones = strategy.calculateDropZones(droppable, session)
		const positions = new Set(zones.map((z) => z.position))

		// Position 0 (insert before item-0) is no longer reachable — that slot is far above.
		expect(positions.has(0)).toBe(false)
		// Position 10 (before item-10) is the new "first visible" insert point.
		expect(positions.has(10)).toBe(true)
		expect(positions.has(18)).toBe(true) // after item-17, still inside the window
	})

	it('returns the empty zone when every slot is scrolled out', () => {
		const rects = [slotRect('only', 0, 0, 5000, 200, 50)]
		const snapshot: LayoutSnapshot = { containerId: 'list', rects, draggedIndex: -1 }
		const droppable = droppableWith('list', { x: 0, y: 0, width: 200, height: 400 })
		const session = sessionWith(snapshot, 'none')

		const zones = strategy.calculateDropZones(droppable, session)

		expect(zones).toHaveLength(1)
		expect(zones[0].position).toBe(0)
	})
})
