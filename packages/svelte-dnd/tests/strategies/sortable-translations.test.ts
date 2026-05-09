import { describe, it, expect } from 'vitest'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'
import type { DragSession } from '../../src/lib/core/dnd/drag-session.svelte.js'
import type { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import type { LayoutSnapshot } from '../../src/lib/core/zones/layout-snapshot.js'
import { DomSortableSource } from '../../src/lib/core/zones/sortable-source.js'
import { slotRect } from '../helpers/fixtures.js'

const rect = (slotId: string, position: number, x: number, y: number, w = 100, h = 50) =>
	slotRect(slotId, position, x, y, w, h)

interface FakeSessionInit {
	snapshot: LayoutSnapshot
	dropPreview: { containerId: string; position: number } | null
	slotSize: { width: number; height: number } | null
	originContainerId: string
	itemId?: string
}

function fakeSession(init: FakeSessionInit): DragSession {
	const itemId = init.itemId ?? 'dragged'
	const source = new DomSortableSource(init.snapshot, itemId)
	return {
		getSource: (id: string) =>
			id === init.originContainerId || init.dropPreview?.containerId === id
				? source
				: undefined,
		dropPreview: init.dropPreview,
		slotSize: init.slotSize,
		originContainerId: init.originContainerId,
		itemId
	} as unknown as DragSession
}

const droppable = (id: string) => ({ id }) as unknown as Droppable

describe('SortableContainerStrategy.getTranslations — vertical', () => {
	const strategy = sortable({ layout: 'vertical' })
	const snapshot: LayoutSnapshot = {
		containerId: 'list',
		rects: [rect('a', 0, 0, 0), rect('b', 1, 0, 60), rect('c', 2, 0, 120)],
		draggedIndex: 2
	}

	it('shifts earlier items forward when the drag moves to an earlier position', () => {
		const session = fakeSession({
			snapshot,
			dropPreview: { containerId: 'list', position: 0 },
			slotSize: { width: 100, height: 60 },
			originContainerId: 'list'
		})

		const map = strategy.getTranslations(droppable('list'), session)

		// Items in [P..D-1] = [0..1] shift forward by the dragged slot's step (60).
		expect(map.get('a')).toEqual({ x: 0, y: 60 })
		expect(map.get('b')).toEqual({ x: 0, y: 60 })
		expect(map.has('c')).toBe(false)
	})

	it('shifts later items backward when the drag moves to a later position', () => {
		const earlySnapshot: LayoutSnapshot = {
			containerId: 'list',
			rects: [rect('a', 0, 0, 0), rect('b', 1, 0, 60), rect('c', 2, 0, 120)],
			draggedIndex: 0
		}
		const session = fakeSession({
			snapshot: earlySnapshot,
			dropPreview: { containerId: 'list', position: 2 },
			slotSize: { width: 100, height: 60 },
			originContainerId: 'list'
		})

		const map = strategy.getTranslations(droppable('list'), session)

		// targetIdx = P+1=3, items in (D..targetIdx) = (0..3) -> indices 1,2 shift back.
		expect(map.get('b')).toEqual({ x: 0, y: -60 })
		expect(map.get('c')).toEqual({ x: 0, y: -60 })
		expect(map.has('a')).toBe(false)
	})

	it('collapses the gap behind the dragged item when there is no drop preview', () => {
		const session = fakeSession({
			snapshot,
			dropPreview: null,
			slotSize: { width: 100, height: 60 },
			originContainerId: 'list'
		})

		const map = strategy.getTranslations(droppable('list'), session)

		// D=2, items at indices > 2 shift back by step. There are none, so map stays empty.
		expect(map.size).toBe(0)
	})

	it('collapses the origin gap when hovering a different container', () => {
		const earlySnapshot: LayoutSnapshot = {
			containerId: 'list',
			rects: [rect('a', 0, 0, 0), rect('b', 1, 0, 60), rect('c', 2, 0, 120)],
			draggedIndex: 0
		}
		const session = fakeSession({
			snapshot: earlySnapshot,
			dropPreview: { containerId: 'other', position: 0 },
			slotSize: { width: 100, height: 60 },
			originContainerId: 'list'
		})

		const map = strategy.getTranslations(droppable('list'), session)

		// Source container collapses items at index > D back by step.
		expect(map.get('b')).toEqual({ x: 0, y: -60 })
		expect(map.get('c')).toEqual({ x: 0, y: -60 })
		expect(map.has('a')).toBe(false)
	})

	it('shifts target items forward when the dragged item arrives from another container', () => {
		const targetSnapshot: LayoutSnapshot = {
			containerId: 'target',
			rects: [rect('x', 0, 0, 0), rect('y', 1, 0, 60), rect('z', 2, 0, 120)],
			draggedIndex: -1 // dragged item is not native to this snapshot
		}
		const session = fakeSession({
			snapshot: targetSnapshot,
			dropPreview: { containerId: 'target', position: 1 },
			slotSize: { width: 100, height: 60 },
			originContainerId: 'source',
			itemId: 'dragged'
		})

		const map = strategy.getTranslations(droppable('target'), session)

		// Items at positions P..end (1..2) shift forward by step.
		expect(map.get('y')).toEqual({ x: 0, y: 60 })
		expect(map.get('z')).toEqual({ x: 0, y: 60 })
		expect(map.has('x')).toBe(false)
	})

	it('returns an empty map when slotSize is missing', () => {
		const session = fakeSession({
			snapshot,
			dropPreview: { containerId: 'list', position: 0 },
			slotSize: null,
			originContainerId: 'list'
		})

		const map = strategy.getTranslations(droppable('list'), session)
		expect(map.size).toBe(0)
	})
})

describe('SortableContainerStrategy.getTranslations — horizontal', () => {
	const strategy = sortable({ layout: 'horizontal' })

	it('shifts later items backward along the x axis', () => {
		const snapshot: LayoutSnapshot = {
			containerId: 'row',
			rects: [
				rect('a', 0, 0, 0, 80, 50),
				rect('b', 1, 90, 0, 80, 50),
				rect('c', 2, 180, 0, 80, 50)
			],
			draggedIndex: 0
		}
		const session = fakeSession({
			snapshot,
			dropPreview: { containerId: 'row', position: 2 },
			slotSize: { width: 90, height: 50 },
			originContainerId: 'row'
		})

		const map = strategy.getTranslations(droppable('row'), session)
		expect(map.get('b')).toEqual({ x: -90, y: 0 })
		expect(map.get('c')).toEqual({ x: -90, y: 0 })
		expect(map.has('a')).toBe(false)
	})
})
