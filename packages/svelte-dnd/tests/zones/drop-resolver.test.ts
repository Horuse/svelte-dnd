import { describe, it, expect } from 'vitest'
import { DropResolver } from '../../src/lib/core/zones/drop-resolver.js'
import { closestCenter } from '../../src/lib/core/collision/closest-center.js'
import type { DndState } from '../../src/lib/core/dnd/dnd-state.svelte.js'
import type { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import type { DropZone } from '../../src/lib/types.js'
import { dropZone as zone } from '../helpers/fixtures.js'

interface FakeDroppable {
	accepts?: string | string[]
	collision?: Droppable['collision']
}

interface FakeStateInit {
	draggedItem?: string | null
	draggedType?: string | undefined
	zones: DropZone[]
	transform?: { x: number; y: number }
	ghostSize?: { width: number; height: number }
}

function fakeState(init: FakeStateInit): DndState {
	return {
		// Preserve an explicitly passed `null` — `??` would replace it with the default.
		draggedItem: 'draggedItem' in init ? init.draggedItem : 'item-1',
		draggedType: init.draggedType,
		zones: init.zones,
		transform: init.transform ?? { x: 0, y: 0 },
		ghostSize: init.ghostSize ?? { width: 0, height: 0 }
	} as unknown as DndState
}

const fakeDroppables = (map: Record<string, FakeDroppable>): Map<string, Droppable> =>
	new Map(Object.entries(map).map(([id, d]) => [id, d as unknown as Droppable]))

describe('DropResolver.findZoneAt', () => {
	it('returns null when no item is being dragged', () => {
		const state = fakeState({ draggedItem: null, zones: [zone('a', 0, 0, 0, 50, 50)] })
		const resolver = new DropResolver(state, fakeDroppables({ a: {} }))

		expect(resolver.findZoneAt({ x: 25, y: 25 })).toBeNull()
	})

	it('matches a zone via the default centerPoint algorithm', () => {
		const z = zone('a', 0, 0, 0, 100, 100)
		const state = fakeState({
			zones: [z],
			transform: { x: 20, y: 20 },
			ghostSize: { width: 30, height: 30 }
		})
		const resolver = new DropResolver(state, fakeDroppables({ a: {} }))

		// ghost center is (20+15, 20+15) = (35, 35), inside the zone
		expect(resolver.findZoneAt({ x: 0, y: 0 })).toBe(z)
	})

	it('skips zones whose container does not accept the dragged type', () => {
		const accepted = zone('a', 0, 0, 0, 100, 100)
		const rejected = zone('b', 0, 200, 0, 100, 100)
		const state = fakeState({
			draggedType: 'card',
			zones: [accepted, rejected],
			transform: { x: 220, y: 20 },
			ghostSize: { width: 30, height: 30 }
		})
		const resolver = new DropResolver(state, fakeDroppables({
			a: { accepts: 'card' },
			b: { accepts: 'task' }
		}))

		// ghost center sits inside rejected, but `b` does not accept 'card'.
		expect(resolver.findZoneAt({ x: 0, y: 0 })).toBeNull()
	})

	it('uses the per-container collision algorithm when one is set', () => {
		const z = zone('a', 0, 1000, 0, 50, 50)
		const state = fakeState({
			zones: [z],
			transform: { x: 0, y: 0 },
			ghostSize: { width: 10, height: 10 }
		})
		// Default centerPoint would not match (ghost far from zone), but closestCenter always picks the
		// nearest zone within a container.
		const resolver = new DropResolver(state, fakeDroppables({
			a: { collision: closestCenter }
		}))

		expect(resolver.findZoneAt({ x: 0, y: 0 })).toBe(z)
	})

	it('falls back to the global algorithm when no per-container one is set', () => {
		const z = zone('a', 0, 1000, 0, 50, 50)
		const state = fakeState({
			zones: [z],
			transform: { x: 0, y: 0 },
			ghostSize: { width: 10, height: 10 }
		})
		const resolver = new DropResolver(state, fakeDroppables({ a: {} }), closestCenter)

		expect(resolver.findZoneAt({ x: 0, y: 0 })).toBe(z)
	})
})
