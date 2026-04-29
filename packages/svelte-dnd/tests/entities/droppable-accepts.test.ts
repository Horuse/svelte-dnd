import { describe, it, expect } from 'vitest'
import { Droppable } from '../../src/lib/core/entities/droppable.svelte.js'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'
import { noopController } from '../helpers/fixtures.js'

function makeDroppable(accepts?: string | string[]): Droppable {
	return new Droppable({ id: 'd', strategy: sortable(), accepts }, noopController())
}

describe('Droppable.acceptsType', () => {
	it('accepts every type when no filter is configured', () => {
		const d = makeDroppable()
		expect(d.acceptsType('task')).toBe(true)
		expect(d.acceptsType('card')).toBe(true)
		expect(d.acceptsType(undefined)).toBe(true)
	})

	it('accepts every untyped item even when a filter is set', () => {
		const d = makeDroppable('task')
		expect(d.acceptsType(undefined)).toBe(true)
	})

	it('matches a single string accept exactly', () => {
		const d = makeDroppable('task')
		expect(d.acceptsType('task')).toBe(true)
		expect(d.acceptsType('card')).toBe(false)
	})

	it('matches any element of an array accept', () => {
		const d = makeDroppable(['task', 'card'])
		expect(d.acceptsType('task')).toBe(true)
		expect(d.acceptsType('card')).toBe(true)
		expect(d.acceptsType('column')).toBe(false)
	})
})
