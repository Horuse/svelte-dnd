import { describe, it, expect, beforeEach } from 'vitest'
import { PointerSensor } from '../../src/lib/core/sensors/pointer-sensor.js'
import { setRect, makeElement } from '../helpers/dom.js'
import { pointerEvent, spyCallbacks } from '../helpers/fixtures.js'

let element: HTMLElement
beforeEach(() => {
	element = makeElement()
	setRect(element, { x: 50, y: 50, width: 200, height: 100 })
	document.body.appendChild(element)
})

describe('PointerSensor.activate — guards', () => {
	it('returns null when the event is not a PointerEvent', () => {
		const sensor = new PointerSensor()
		const result = sensor.activate(new MouseEvent('mousedown'), element, spyCallbacks())
		expect(result).toBeNull()
	})

	it('returns null for non-primary mouse buttons', () => {
		const sensor = new PointerSensor()
		const event = pointerEvent({ button: 2, target: element })
		expect(sensor.activate(event, element, spyCallbacks())).toBeNull()
	})

	it('returns null when the pointer is outside the padding box', () => {
		const sensor = new PointerSensor()
		// container goes from x=50..250, y=50..150. Click at (300, 300) is outside.
		const event = pointerEvent({ clientX: 300, clientY: 300, target: element })
		expect(sensor.activate(event, element, spyCallbacks())).toBeNull()
	})

	it('returns null when the pointerdown lands on a data-dnd-no-drag descendant', () => {
		const sensor = new PointerSensor()
		const child = document.createElement('button')
		child.setAttribute('data-dnd-no-drag', '')
		element.appendChild(child)

		const event = pointerEvent({ target: child })
		expect(sensor.activate(event, element, spyCallbacks())).toBeNull()
	})

	it('returns null when the element has handles but the target is not inside one', () => {
		const sensor = new PointerSensor()
		const handle = document.createElement('span')
		handle.setAttribute('data-dnd-handle', '')
		element.appendChild(handle)
		const other = document.createElement('span')
		element.appendChild(other)

		const event = pointerEvent({ target: other })
		expect(sensor.activate(event, element, spyCallbacks())).toBeNull()
	})

	it('activates when the pointer hits an element-with-handle through that handle', () => {
		const sensor = new PointerSensor()
		const handle = document.createElement('span')
		handle.setAttribute('data-dnd-handle', '')
		setRect(handle, { x: 50, y: 50, width: 30, height: 30 })
		element.appendChild(handle)

		const event = pointerEvent({ target: handle, clientX: 60, clientY: 60 })
		const result = sensor.activate(event, element, spyCallbacks())
		expect(result).not.toBeNull()
	})
})

describe('PointerSensor.activate — activation lifecycle', () => {
	it('returns an activation with offset and initialTransform anchored to the click point', () => {
		const sensor = new PointerSensor()
		const event = pointerEvent({ target: element, clientX: 80, clientY: 70 })
		const result = sensor.activate(event, element, spyCallbacks())

		expect(result).not.toBeNull()
		// offset = clientX/Y - rect.left/top
		expect(result!.offset).toEqual({ x: 30, y: 20 })
		// initialTransform = client - offset → element top-left
		expect(result!.initialTransform).toEqual({ x: 50, y: 50 })
	})

	it('does not call onStart on a tiny mouse move below the 5px threshold', () => {
		const sensor = new PointerSensor()
		const callbacks = spyCallbacks()
		const event = pointerEvent({ target: element, clientX: 100, clientY: 100 })
		sensor.activate(event, element, callbacks)

		element.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 102, clientY: 101 }))
		expect(callbacks.onStart).not.toHaveBeenCalled()
	})

	it('calls onStart once a mouse move exceeds the 5px Distance default', () => {
		const sensor = new PointerSensor()
		const callbacks = spyCallbacks()
		const event = pointerEvent({ target: element, clientX: 100, clientY: 100 })
		sensor.activate(event, element, callbacks)

		element.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 110, clientY: 100 }))
		expect(callbacks.onStart).toHaveBeenCalledTimes(1)
		// transform = client - offset = (110 - 50, 100 - 50) = (60, 50)
		expect(callbacks.onStart).toHaveBeenCalledWith({ x: 60, y: 50 })
	})

	it('routes subsequent window pointermove events to onMove after start', () => {
		const sensor = new PointerSensor()
		const callbacks = spyCallbacks()
		const event = pointerEvent({ target: element, clientX: 100, clientY: 100 })
		sensor.activate(event, element, callbacks)

		// Trigger start
		element.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 110, clientY: 100 }))
		callbacks.onMove.mockClear()
		// Now window-level moves should propagate
		window.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 120, clientY: 130 }))
		expect(callbacks.onMove).toHaveBeenCalledTimes(1)
		expect(callbacks.onMove).toHaveBeenCalledWith({ x: 70, y: 80 }, 120, 130)
	})

	it('calls onEnd on a window pointerup after the drag has started', () => {
		const sensor = new PointerSensor()
		const callbacks = spyCallbacks()
		const event = pointerEvent({ target: element, clientX: 100, clientY: 100 })
		sensor.activate(event, element, callbacks)

		element.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 110, clientY: 100 }))
		window.dispatchEvent(pointerEvent({ type: 'pointerup' }))
		expect(callbacks.onEnd).toHaveBeenCalledTimes(1)
	})

	it('destroy() removes element listeners — subsequent moves do not fire onStart', () => {
		const sensor = new PointerSensor()
		const callbacks = spyCallbacks()
		const event = pointerEvent({ target: element, clientX: 100, clientY: 100 })
		const result = sensor.activate(event, element, callbacks)!

		result.destroy()
		element.dispatchEvent(pointerEvent({ type: 'pointermove', clientX: 200, clientY: 200 }))
		expect(callbacks.onStart).not.toHaveBeenCalled()
	})
})
