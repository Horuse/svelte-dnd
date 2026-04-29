import { describe, it, expect } from 'vitest'
import { Slot } from '../../src/lib/core/entities/slot.js'
import { makeElement, setRect } from '../helpers/dom.js'

interface FakeDroppable {
	getSlotAt(position: number): Slot | undefined
	spacing?: number
	layout: 'vertical' | 'horizontal' | 'grid'
}

interface SlotFixture {
	position: number
	slotRect: { x: number; y: number; width: number; height: number }
	draggableRect: { x: number; y: number; width: number; height: number }
}

function buildSlot(droppable: FakeDroppable, fixture: SlotFixture): Slot {
	const slot = new Slot(fixture.position)
	slot.element = makeElement()
	setRect(slot.element, fixture.slotRect)

	const draggableEl = makeElement()
	setRect(draggableEl, fixture.draggableRect)
	// Slot only reads .draggable.element offsetWidth/Height, so the minimal stub is enough.
	slot.draggable = { element: draggableEl } as Slot['draggable']

	slot.droppable = droppable as unknown as Slot['droppable']
	return slot
}

describe('Slot.getSize', () => {
	it('uses the next sibling rect when one exists (vertical step)', () => {
		const slots = new Map<number, Slot>()
		const droppable: FakeDroppable = {
			getSlotAt: (p) => slots.get(p),
			layout: 'vertical'
		}

		const slot0 = buildSlot(droppable, {
			position: 0,
			slotRect: { x: 0, y: 0, width: 100, height: 50 },
			draggableRect: { x: 0, y: 0, width: 100, height: 40 }
		})
		const slot1 = buildSlot(droppable, {
			position: 1,
			slotRect: { x: 0, y: 60, width: 100, height: 50 },
			draggableRect: { x: 0, y: 60, width: 100, height: 40 }
		})
		slots.set(0, slot0)
		slots.set(1, slot1)

		expect(slot0.getSize()).toEqual({ width: 0, height: 60 })
	})

	it('uses the previous sibling and the actual gap when there is no next slot (vertical)', () => {
		const slots = new Map<number, Slot>()
		const droppable: FakeDroppable = {
			getSlotAt: (p) => slots.get(p),
			layout: 'vertical'
		}

		const slot0 = buildSlot(droppable, {
			position: 0,
			slotRect: { x: 0, y: 0, width: 100, height: 50 },
			draggableRect: { x: 0, y: 0, width: 100, height: 40 }
		})
		const slot1 = buildSlot(droppable, {
			position: 1,
			slotRect: { x: 0, y: 60, width: 100, height: 50 },
			draggableRect: { x: 0, y: 60, width: 100, height: 40 }
		})
		slots.set(0, slot0)
		slots.set(1, slot1)

		// gap = slot1.top(60) - (slot0.top(0) + slot0.draggable.offsetHeight(40)) = 20
		// height = slot1.draggable.offsetHeight(40) + max(0, 20) = 60
		expect(slot1.getSize()).toEqual({ width: 100, height: 60 })
	})

	it('falls back to draggable size + spacing on a vertical-only solitary slot', () => {
		const slots = new Map<number, Slot>()
		const droppable: FakeDroppable = {
			getSlotAt: (p) => slots.get(p),
			layout: 'vertical',
			spacing: 12
		}

		const solo = buildSlot(droppable, {
			position: 0,
			slotRect: { x: 0, y: 0, width: 100, height: 40 },
			draggableRect: { x: 0, y: 0, width: 100, height: 40 }
		})
		slots.set(0, solo)

		// width takes nothing from spacing in vertical layout; height adds spacing.
		expect(solo.getSize()).toEqual({ width: 100, height: 52 })
	})

	it('falls back to draggable size + spacing on a horizontal-only solitary slot', () => {
		const slots = new Map<number, Slot>()
		const droppable: FakeDroppable = {
			getSlotAt: (p) => slots.get(p),
			layout: 'horizontal',
			spacing: 8
		}

		const solo = buildSlot(droppable, {
			position: 0,
			slotRect: { x: 0, y: 0, width: 60, height: 60 },
			draggableRect: { x: 0, y: 0, width: 60, height: 60 }
		})
		slots.set(0, solo)

		expect(solo.getSize()).toEqual({ width: 68, height: 60 })
	})

	it('treats undefined spacing as zero on a solitary slot', () => {
		const slots = new Map<number, Slot>()
		const droppable: FakeDroppable = {
			getSlotAt: (p) => slots.get(p),
			layout: 'vertical'
			// spacing intentionally omitted
		}

		const solo = buildSlot(droppable, {
			position: 0,
			slotRect: { x: 0, y: 0, width: 100, height: 40 },
			draggableRect: { x: 0, y: 0, width: 100, height: 40 }
		})
		slots.set(0, solo)

		expect(solo.getSize()).toEqual({ width: 100, height: 40 })
	})
})
