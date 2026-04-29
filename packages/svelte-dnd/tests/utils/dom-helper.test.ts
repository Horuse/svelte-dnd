import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { DOMHelper } from '../../src/lib/core/utils/dom-helper.js'
import { setRect, makeElement } from '../helpers/dom.js'

function mountContainer(id = 'list'): HTMLElement {
	const el = makeElement()
	el.setAttribute('data-dnd-drop-id', id)
	document.body.appendChild(el)
	return el
}

describe('DOMHelper.findContainer', () => {
	let container: HTMLElement

	beforeEach(() => { container = mountContainer() })
	afterEach(() => container.remove())

	it('locates a container by its data-dnd-drop-id', () => {
		expect(DOMHelper.findContainer('list')).toBe(container)
	})

	it('returns null when no container matches the id', () => {
		expect(DOMHelper.findContainer('missing')).toBeNull()
	})

	it('escapes ids that contain special CSS characters', () => {
		const fancy = makeElement()
		fancy.setAttribute('data-dnd-drop-id', 'list[1].column')
		document.body.appendChild(fancy)
		try {
			expect(DOMHelper.findContainer('list[1].column')).toBe(fancy)
		} finally {
			fancy.remove()
		}
	})
})

describe('DOMHelper.getContainerRect', () => {
	it('returns the container rect when found, null when missing', () => {
		const container = mountContainer()
		setRect(container, { x: 10, y: 20, width: 200, height: 100 })
		try {
			const rect = DOMHelper.getContainerRect('list')
			expect(rect?.left).toBe(10)
			expect(rect?.width).toBe(200)
			expect(DOMHelper.getContainerRect('missing')).toBeNull()
		} finally {
			container.remove()
		}
	})
})

describe('DOMHelper.isElementVisibleInContainer', () => {
	let container: HTMLElement

	beforeEach(() => {
		container = makeElement()
		setRect(container, { x: 0, y: 0, width: 200, height: 200 })
	})

	it('returns true when the element fits inside on all four sides', () => {
		const child = makeElement()
		setRect(child, { x: 10, y: 10, width: 100, height: 100 })
		expect(DOMHelper.isElementVisibleInContainer(child, container)).toBe(true)
	})

	it('returns false when the element overhangs the top edge', () => {
		const child = makeElement()
		setRect(child, { x: 10, y: -10, width: 100, height: 50 })
		expect(DOMHelper.isElementVisibleInContainer(child, container)).toBe(false)
	})

	it('returns false when the element overhangs the bottom edge', () => {
		const child = makeElement()
		setRect(child, { x: 10, y: 180, width: 100, height: 30 })
		expect(DOMHelper.isElementVisibleInContainer(child, container)).toBe(false)
	})

	it('returns false when the element overhangs the left edge', () => {
		const child = makeElement()
		setRect(child, { x: -10, y: 10, width: 50, height: 50 })
		expect(DOMHelper.isElementVisibleInContainer(child, container)).toBe(false)
	})

	it('returns false when the element overhangs the right edge', () => {
		const child = makeElement()
		setRect(child, { x: 180, y: 10, width: 50, height: 50 })
		expect(DOMHelper.isElementVisibleInContainer(child, container)).toBe(false)
	})
})

describe('DOMHelper.findPreview / findPreviewSlot', () => {
	let container: HTMLElement

	beforeEach(() => { container = mountContainer() })
	afterEach(() => container.remove())

	it('finds a preview owned by the given container', () => {
		const slot = document.createElement('div')
		const preview = document.createElement('div')
		preview.setAttribute('data-dnd-preview-position', '2')
		slot.appendChild(preview)
		container.appendChild(slot)

		expect(DOMHelper.findPreview(container, 2)).toBe(preview)
	})

	it('skips previews that belong to a nested droppable', () => {
		const inner = document.createElement('div')
		inner.setAttribute('data-dnd-drop-id', 'inner')
		const innerPreview = document.createElement('div')
		innerPreview.setAttribute('data-dnd-preview-position', '0')
		inner.appendChild(innerPreview)
		container.appendChild(inner)

		// only the inner droppable owns this preview, the outer one has none
		expect(DOMHelper.findPreview(container, 0)).toBeNull()
	})

	it('returns the preview wrapper element for the slot lookup', () => {
		const slot = document.createElement('div')
		slot.className = 'wrapper'
		const preview = document.createElement('div')
		preview.setAttribute('data-dnd-preview-position', '1')
		slot.appendChild(preview)
		container.appendChild(slot)

		expect(DOMHelper.findPreviewSlot(container, 1)).toBe(slot)
		expect(DOMHelper.findPreviewSlot(container, 999)).toBeNull()
	})
})
