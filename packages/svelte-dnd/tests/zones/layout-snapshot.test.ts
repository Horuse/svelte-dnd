import { describe, it, expect } from 'vitest'
import { captureLayoutSnapshot, toViewportRect } from '../../src/lib/core/zones/layout-snapshot.js'
import { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import { Slot } from '../../src/lib/core/entities/slot.js'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'
import { setRect, makeElement, type FakeRect } from '../helpers/dom.js'
import { noopController, scrollableEl } from '../helpers/fixtures.js'

interface SlotInit {
	id: string
	position: number
	rect: FakeRect
}

function buildDroppable(
	containerRect: FakeRect,
	slotInits: SlotInit[],
	scroll = { left: 0, top: 0 }
): Droppable {
	const droppable = new Droppable({ id: 'list', strategy: sortable() }, noopController())
	droppable.element = scrollableEl(containerRect, scroll)

	for (const init of slotInits) {
		const slot = new Slot(init.position)
		const slotEl = makeElement()
		setRect(slotEl, init.rect)
		slot.element = slotEl
		slot.draggable = { id: init.id } as Slot['draggable']
		slot.droppable = droppable
		droppable.slots.set(slotEl, slot)
	}

	return droppable
}

describe('captureLayoutSnapshot', () => {
	it('returns an empty rects array and draggedIndex=-1 for an empty droppable', () => {
		const droppable = buildDroppable({ x: 0, y: 0, width: 200, height: 600 }, [])
		const snapshot = captureLayoutSnapshot(droppable, null)

		expect(snapshot.containerId).toBe('list')
		expect(snapshot.rects).toHaveLength(0)
		expect(snapshot.draggedIndex).toBe(-1)
	})

	it('records each slot in content-space coordinates relative to the container', () => {
		const droppable = buildDroppable({ x: 100, y: 200, width: 200, height: 600 }, [
			{ id: 'a', position: 0, rect: { x: 100, y: 200, width: 200, height: 50 } },
			{ id: 'b', position: 1, rect: { x: 100, y: 260, width: 200, height: 50 } }
		])

		const snapshot = captureLayoutSnapshot(droppable, null)

		// containerRect.left = 100, containerRect.top = 200 → offsets are slot.left - container.left.
		expect(snapshot.rects[0]).toMatchObject({
			slotId: 'a',
			position: 0,
			offsetLeft: 0,
			offsetTop: 0,
			width: 200,
			height: 50
		})
		expect(snapshot.rects[1]).toMatchObject({
			slotId: 'b',
			position: 1,
			offsetLeft: 0,
			offsetTop: 60,
			width: 200,
			height: 50
		})
	})

	it('adds container scroll offsets back into the captured offsets', () => {
		const droppable = buildDroppable(
			{ x: 0, y: 0, width: 200, height: 200 },
			[{ id: 'a', position: 0, rect: { x: 0, y: -50, width: 200, height: 50 } }],
			{ left: 0, top: 100 }
		)

		const snapshot = captureLayoutSnapshot(droppable, null)
		// content-space top = viewport top (-50) - container top (0) + scrollTop (100) = 50
		expect(snapshot.rects[0].offsetTop).toBe(50)
	})

	it('finds the dragged slot index by id and orders rects by slot.position', () => {
		// Insert in scrambled order to verify sorting.
		const droppable = buildDroppable({ x: 0, y: 0, width: 200, height: 600 }, [
			{ id: 'b', position: 1, rect: { x: 0, y: 60, width: 200, height: 50 } },
			{ id: 'c', position: 2, rect: { x: 0, y: 120, width: 200, height: 50 } },
			{ id: 'a', position: 0, rect: { x: 0, y: 0, width: 200, height: 50 } }
		])

		const snapshot = captureLayoutSnapshot(droppable, 'b')

		// Sorted by position
		expect(snapshot.rects.map((r) => r.slotId)).toEqual(['a', 'b', 'c'])
		expect(snapshot.draggedIndex).toBe(1)
	})

	it('returns draggedIndex=-1 when the dragged id is not in the snapshot', () => {
		const droppable = buildDroppable({ x: 0, y: 0, width: 200, height: 600 }, [
			{ id: 'a', position: 0, rect: { x: 0, y: 0, width: 200, height: 50 } }
		])
		const snapshot = captureLayoutSnapshot(droppable, 'missing')
		expect(snapshot.draggedIndex).toBe(-1)
	})
})

describe('toViewportRect', () => {
	it('reverses captureLayoutSnapshot — projects content space back to viewport', () => {
		const containerRect = { left: 100, top: 200 } as DOMRect
		const result = toViewportRect(
			{ slotId: 'a', position: 0, offsetLeft: 0, offsetTop: 60, width: 200, height: 50 },
			containerRect,
			0,
			0
		)
		expect(result).toEqual({ x: 100, y: 260, width: 200, height: 50 })
	})

	it('subtracts the current scroll offset from the projected rect', () => {
		const containerRect = { left: 0, top: 0 } as DOMRect
		const result = toViewportRect(
			{ slotId: 'a', position: 0, offsetLeft: 0, offsetTop: 100, width: 200, height: 50 },
			containerRect,
			0,
			40
		)
		expect(result.y).toBe(60)
	})
})
