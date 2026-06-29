import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
	Droppable,
	type DroppableControllerRef
} from '../../src/lib/core/entities/droppable.svelte.js'
import { sortable } from '../../src/lib/core/containers/strategies/sortable-container-strategy.js'

type DragStartCallback = Parameters<DroppableControllerRef['onDragStart']>[0]

function makeController() {
	let dragStart: DragStartCallback | undefined
	const refreshDroppableZones = vi.fn<DroppableControllerRef['refreshDroppableZones']>()
	const recomputeDropPreview = vi.fn<DroppableControllerRef['recomputeDropPreview']>()
	const ref: DroppableControllerRef = {
		session: null,
		draggedElement: null,
		cancelSession: () => {},
		slots: new Map(),
		onDragStart: (cb) => {
			dragStart = cb
			return () => {}
		},
		onZonesInvalidated: () => () => {},
		onDragEnd: () => () => {},
		refreshDroppableZones,
		recomputeDropPreview,
		dragging: true
	}
	return {
		ref,
		refreshDroppableZones,
		recomputeDropPreview,
		startDrag: () => dragStart?.({} as Parameters<DragStartCallback>[0])
	}
}

function makeDroppable(element: HTMLElement, controller: DroppableControllerRef): Droppable {
	const d = new Droppable({ id: 'd', strategy: sortable({ virtual: { itemCount: () => 3 } }) }, controller)
	d.element = element
	return d
}

describe('Droppable scroll handling during drag', () => {
	beforeEach(() => vi.useFakeTimers())
	afterEach(() => {
		vi.runOnlyPendingTimers()
		vi.useRealTimers()
		document.body.innerHTML = ''
	})

	it('re-resolves zones and drop preview when its own element scrolls', () => {
		const controller = makeController()
		const el = document.createElement('div')
		el.style.overflowY = 'auto'
		document.body.appendChild(el)

		const d = makeDroppable(el, controller.ref)
		d.setupEventListeners()
		controller.startDrag()

		el.dispatchEvent(new Event('scroll'))
		vi.advanceTimersByTime(10)

		expect(controller.refreshDroppableZones).toHaveBeenCalledWith(d)
		expect(controller.recomputeDropPreview).toHaveBeenCalledTimes(1)
	})

	it('listens on a nested virtualizer viewport marked data-dnd-scroll', () => {
		const controller = makeController()
		const el = document.createElement('div')
		el.style.overflowY = 'hidden'
		const viewport = document.createElement('div')
		viewport.setAttribute('data-dnd-scroll', '')
		el.appendChild(viewport)
		document.body.appendChild(el)

		const d = makeDroppable(el, controller.ref)
		d.setupEventListeners()
		controller.startDrag()

		viewport.dispatchEvent(new Event('scroll'))
		vi.advanceTimersByTime(10)

		expect(controller.refreshDroppableZones).toHaveBeenCalledWith(d)
		expect(controller.recomputeDropPreview).toHaveBeenCalledTimes(1)
	})

	it('stops re-resolving once the drag ends', () => {
		const controller = makeController()
		const el = document.createElement('div')
		el.style.overflowY = 'auto'
		document.body.appendChild(el)

		const d = makeDroppable(el, controller.ref)
		d.setupEventListeners()
		controller.startDrag()
		d.destroy()

		el.dispatchEvent(new Event('scroll'))
		vi.advanceTimersByTime(10)

		expect(controller.recomputeDropPreview).not.toHaveBeenCalled()
	})
})
