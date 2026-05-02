import { describe, it, expect } from 'vitest'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'
import type { DragSession } from '../../src/lib/core/dnd/drag-session.svelte.js'
import type { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import type { Slot } from '../../src/lib/core/entities/slot.js'
import type { VirtualSource } from '../../src/lib/core/zones/sortable-source.js'
import { scrollableEl } from '../helpers/fixtures.js'
import { setRect, makeElement } from '../helpers/dom.js'

interface MountedSlotInit {
	id: string
	position: number
	rect?: { x: number; y: number; width: number; height: number }
}

const mountedSlot = ({ id, position, rect }: MountedSlotInit): Slot => {
	const element = makeElement()
	if (rect) setRect(element, rect)
	return { position, draggable: { id }, element } as unknown as Slot
}

const droppableWith = (
	id: string,
	rect: { x: number; y: number; width: number; height: number },
	slots: Slot[]
) => {
	const element = scrollableEl(rect)
	return {
		id,
		element,
		getSortedSlots: () => slots
	} as unknown as Droppable
}

const itemSize = 50
const itemCount = 5000
const virtual: VirtualSource = {
	itemCount: () => itemCount,
	getOffset: (i: number) => i * itemSize,
	getSize: () => itemSize
}

interface SessionInit {
	itemId: string
	originContainerId?: string
	originPosition?: number
	dropPreview?: { containerId: string; position: number } | null
	slotSize?: { width: number; height: number } | null
}

function makeSession(init: SessionInit): DragSession {
	const sources = new Map()
	return {
		setSource: (id: string, src: unknown) => sources.set(id, src),
		getSource: (id: string) => sources.get(id),
		itemId: init.itemId,
		originContainerId: init.originContainerId ?? 'virt',
		originPosition: init.originPosition ?? 0,
		dropPreview: init.dropPreview ?? null,
		slotSize: init.slotSize ?? null
	} as unknown as DragSession
}

describe('SortableContainerStrategy.calculateDropZones — virtual mode', () => {
	const strategy = sortable({ layout: 'vertical', virtual })

	it('emits zones only for slots mounted in the visible viewport window', () => {
		// Container 200x400 at viewport (0, 0). 8 mounted slots stack inside the viewport
		// — that's what virtua would render at this scroll position.
		const slots = [100, 101, 102, 103, 104, 105, 106, 107].map((p, i) =>
			mountedSlot({
				id: `item-${p}`,
				position: p,
				rect: { x: 0, y: i * itemSize, width: 200, height: itemSize }
			})
		)
		const droppable = droppableWith('virt', { x: 0, y: 0, width: 200, height: 400 }, slots)
		const session = makeSession({ itemId: 'none', originContainerId: 'other' })

		strategy.onSessionStart(droppable, session)

		const zones = strategy.calculateDropZones(droppable, session)
		const positions = zones.map((z) => z.position).sort((a, b) => a - b)

		expect(positions[0]).toBe(100)
		expect(positions[positions.length - 1]).toBe(108)
	})

	it('drops zones for slots whose rect falls outside the container viewport', () => {
		// item-100 is mounted but offscreen (e.g. virtua keeps it via keepMounted).
		// Two more slots are inside the viewport.
		const slots = [
			mountedSlot({ id: 'item-100', position: 100, rect: { x: 0, y: -200, width: 200, height: itemSize } }),
			mountedSlot({ id: 'item-201', position: 201, rect: { x: 0, y: 0, width: 200, height: itemSize } }),
			mountedSlot({ id: 'item-202', position: 202, rect: { x: 0, y: itemSize, width: 200, height: itemSize } })
		]
		const droppable = droppableWith('virt', { x: 0, y: 0, width: 200, height: 400 }, slots)
		const session = makeSession({ itemId: 'none', originContainerId: 'other' })

		strategy.onSessionStart(droppable, session)
		const zones = strategy.calculateDropZones(droppable, session)
		const positions = new Set(zones.map((z) => z.position))

		// item-100 is offscreen, so position 100 is unreachable from this viewport.
		expect(positions.has(100)).toBe(false)
		expect(positions.has(201)).toBe(true)
		expect(positions.has(203)).toBe(true)
	})

	it('returns the empty zone when no slots are mounted', () => {
		const droppable = droppableWith('virt', { x: 0, y: 0, width: 200, height: 400 }, [])
		const session = makeSession({ itemId: 'none', originContainerId: 'other' })

		strategy.onSessionStart(droppable, session)
		const zones = strategy.calculateDropZones(droppable, session)
		expect(zones).toHaveLength(1)
		expect(zones[0].position).toBe(0)
	})
})

describe('SortableContainerStrategy.getTranslations — virtual mode', () => {
	const strategy = sortable({ layout: 'vertical', virtual })

	it('shifts later mounted slots back when the drag moves to a higher position', () => {
		const slots = [100, 101, 102, 103, 104].map((p) => mountedSlot({ id: `item-${p}`, position: p }))
		const droppable = droppableWith('virt', { x: 0, y: 0, width: 200, height: 400 }, slots)
		const session = makeSession({
			itemId: 'item-100',
			originPosition: 100,
			dropPreview: { containerId: 'virt', position: 103 },
			slotSize: { width: 200, height: itemSize }
		})

		strategy.onSessionStart(droppable, session)
		const map = strategy.getTranslations(droppable, session)

		// D=100, P=103, targetIdx=104. Items at positions 101..103 fill the gap by shifting up by 50.
		expect(map.get('item-101')).toEqual({ x: 0, y: -itemSize })
		expect(map.get('item-102')).toEqual({ x: 0, y: -itemSize })
		expect(map.get('item-103')).toEqual({ x: 0, y: -itemSize })
		expect(map.has('item-104')).toBe(false)
	})

	it('does not produce translations for slots that were unmounted by the virtualizer', () => {
		// Only positions 100 and 102 are mounted; 101 was unmounted (some weird virtualizer).
		// We should still emit translations for the mounted ones based on their slot.position.
		const slots = [100, 102, 103].map((p) => mountedSlot({ id: `item-${p}`, position: p }))
		const droppable = droppableWith('virt', { x: 0, y: 0, width: 200, height: 400 }, slots)
		const session = makeSession({
			itemId: 'item-100',
			originPosition: 100,
			dropPreview: { containerId: 'virt', position: 103 },
			slotSize: { width: 200, height: itemSize }
		})

		strategy.onSessionStart(droppable, session)
		const map = strategy.getTranslations(droppable, session)

		// 102 is in (D=100..targetIdx=104) → shift back. 101 is not mounted → skipped.
		expect(map.get('item-102')).toEqual({ x: 0, y: -itemSize })
		expect(map.get('item-103')).toEqual({ x: 0, y: -itemSize })
		expect(map.has('item-101')).toBe(false)
	})
})
