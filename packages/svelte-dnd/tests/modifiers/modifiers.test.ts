import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { restrictToVerticalAxis } from '../../src/lib/core/modifiers/restrict-to-vertical-axis.js'
import { restrictToHorizontalAxis } from '../../src/lib/core/modifiers/restrict-to-horizontal-axis.js'
import { restrictToContainer } from '../../src/lib/core/modifiers/restrict-to-container.js'
import { snapToGrid } from '../../src/lib/core/modifiers/snap-to-grid.js'
import type { ModifierContext } from '../../src/lib/core/modifiers/modifier.js'
import { setRect } from '../helpers/dom.js'

function ctx(partial: Partial<ModifierContext>): ModifierContext {
	return {
		transform: { x: 0, y: 0 },
		initialTransform: { x: 0, y: 0 },
		ghostSize: { width: 0, height: 0 },
		originContainerId: 'container',
		...partial
	}
}

describe('restrictToVerticalAxis', () => {
	it('locks x to the initial value while letting y move freely', () => {
		const result = restrictToVerticalAxis(
			ctx({
				transform: { x: 99, y: 50 },
				initialTransform: { x: 10, y: 0 }
			})
		)
		expect(result).toEqual({ x: 10, y: 50 })
	})
})

describe('restrictToHorizontalAxis', () => {
	it('locks y to the initial value while letting x move freely', () => {
		const result = restrictToHorizontalAxis(
			ctx({
				transform: { x: 50, y: 99 },
				initialTransform: { x: 0, y: 20 }
			})
		)
		expect(result).toEqual({ x: 50, y: 20 })
	})
})

describe('restrictToContainer', () => {
	let container: HTMLElement

	beforeEach(() => {
		container = document.createElement('div')
		container.setAttribute('data-dnd-drop-id', 'container')
		setRect(container, { x: 100, y: 200, width: 400, height: 300 })
		document.body.appendChild(container)
	})

	afterEach(() => {
		container.remove()
	})

	it('clamps the transform inside the container bounds accounting for ghost size', () => {
		const result = restrictToContainer(
			ctx({
				transform: { x: 1000, y: 1000 },
				ghostSize: { width: 50, height: 40 }
			})
		)
		expect(result).toEqual({ x: 100 + 400 - 50, y: 200 + 300 - 40 })
	})

	it('clamps the transform up to the top-left corner', () => {
		const result = restrictToContainer(
			ctx({
				transform: { x: -500, y: -500 },
				ghostSize: { width: 50, height: 40 }
			})
		)
		expect(result).toEqual({ x: 100, y: 200 })
	})

	it('returns the transform unchanged when the container element cannot be found', () => {
		const result = restrictToContainer(
			ctx({
				transform: { x: 9999, y: 9999 },
				ghostSize: { width: 50, height: 50 },
				originContainerId: 'missing'
			})
		)
		expect(result).toEqual({ x: 9999, y: 9999 })
	})
})

describe('snapToGrid', () => {
	it('snaps both axes to a single grid size when given a number', () => {
		const modifier = snapToGrid(20)
		expect(modifier(ctx({ transform: { x: 23, y: 31 } }))).toEqual({ x: 20, y: 40 })
	})

	it('uses independent x and y grid sizes when given an object', () => {
		const modifier = snapToGrid({ x: 10, y: 25 })
		expect(modifier(ctx({ transform: { x: 47, y: 38 } }))).toEqual({ x: 50, y: 50 })
	})

	it('rounds half-step values upward (Math.round behaviour)', () => {
		const modifier = snapToGrid(10)
		expect(modifier(ctx({ transform: { x: 5, y: 5 } }))).toEqual({ x: 10, y: 10 })
	})
})
