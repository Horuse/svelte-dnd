import { describe, it, expect } from 'vitest'
import { getDirectionAdapter } from '../../src/lib/core/animation/direction-adapter.js'
import { setRect, makeElement } from '../helpers/dom.js'

describe('getDirectionAdapter', () => {
	it('reads/writes scrollTop and uses rect.top/.height for vertical', () => {
		const adapter = getDirectionAdapter('vertical')
		const container = makeElement()
		Object.defineProperty(container, 'scrollTop', { configurable: true, writable: true, value: 30 })
		Object.defineProperty(container, 'scrollLeft', { configurable: true, writable: true, value: 0 })

		expect(adapter.getScroll(container)).toBe(30)
		adapter.setScroll(container, 100)
		expect(container.scrollTop).toBe(100)
		expect(container.scrollLeft).toBe(0)

		const rect = makeElement()
		setRect(rect, { x: 5, y: 50, width: 200, height: 100 })
		const r = rect.getBoundingClientRect()
		expect(adapter.getPosition(r)).toBe(50)
		expect(adapter.getSize(r)).toBe(100)
		expect(adapter.getEndPosition(r, 100)).toBe(150)
	})

	it('reads/writes scrollLeft and uses rect.left/.width for horizontal', () => {
		const adapter = getDirectionAdapter('horizontal')
		const container = makeElement()
		Object.defineProperty(container, 'scrollTop', { configurable: true, writable: true, value: 0 })
		Object.defineProperty(container, 'scrollLeft', { configurable: true, writable: true, value: 25 })

		expect(adapter.getScroll(container)).toBe(25)
		adapter.setScroll(container, 80)
		expect(container.scrollLeft).toBe(80)
		expect(container.scrollTop).toBe(0)

		const rect = makeElement()
		setRect(rect, { x: 30, y: 0, width: 150, height: 50 })
		const r = rect.getBoundingClientRect()
		expect(adapter.getPosition(r)).toBe(30)
		expect(adapter.getSize(r)).toBe(150)
		expect(adapter.getEndPosition(r, 150)).toBe(180)
	})
})
