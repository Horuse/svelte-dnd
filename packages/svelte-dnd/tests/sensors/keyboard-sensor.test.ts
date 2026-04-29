import { describe, it, expect, beforeEach } from 'vitest'
import { KeyboardSensor } from '../../src/lib/core/sensors/keyboard-sensor.js'
import { setRect, makeElement } from '../helpers/dom.js'
import { spyCallbacks } from '../helpers/fixtures.js'

let element: HTMLElement
beforeEach(() => {
	element = makeElement()
	setRect(element, { x: 100, y: 80, width: 200, height: 60 })
	document.body.appendChild(element)
})

async function flushTimers() {
	await new Promise<void>((resolve) => setTimeout(resolve, 1))
}

describe('KeyboardSensor.activate — guards', () => {
	it('returns null for non-keyboard events', () => {
		const sensor = new KeyboardSensor()
		const result = sensor.activate(new MouseEvent('click'), element, spyCallbacks())
		expect(result).toBeNull()
	})

	it('returns null for keys other than Enter or Space', () => {
		const sensor = new KeyboardSensor()
		const event = new KeyboardEvent('keydown', { key: 'Tab' })
		expect(sensor.activate(event, element, spyCallbacks())).toBeNull()
	})
})

describe('KeyboardSensor.activate — lifecycle', () => {
	it('starts the drag immediately on Enter and reports the element top-left as initialTransform', () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		const event = new KeyboardEvent('keydown', { key: 'Enter' })

		const result = sensor.activate(event, element, callbacks)

		expect(result).not.toBeNull()
		expect(result!.initialTransform).toEqual({ x: 100, y: 80 })
		// offset = element center
		expect(result!.offset).toEqual({ x: 100, y: 30 })
		expect(callbacks.onStart).toHaveBeenCalledTimes(1)
		expect(callbacks.onStart).toHaveBeenCalledWith({ x: 100, y: 80 })
	})

	it('also activates on Space', () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		const event = new KeyboardEvent('keydown', { key: ' ' })

		expect(sensor.activate(event, element, callbacks)).not.toBeNull()
		expect(callbacks.onStart).toHaveBeenCalledTimes(1)
	})

	it('translates ArrowDown into an onNavigate("down") callback', async () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		sensor.activate(new KeyboardEvent('keydown', { key: 'Enter' }), element, callbacks)
		await flushTimers()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		expect(callbacks.onNavigate).toHaveBeenCalledTimes(1)
		expect(callbacks.onNavigate).toHaveBeenCalledWith('down')
	})

	it('maps every arrow direction', async () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		sensor.activate(new KeyboardEvent('keydown', { key: 'Enter' }), element, callbacks)
		await flushTimers()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }))
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
		expect(callbacks.onNavigate.mock.calls.map((c) => c[0])).toEqual(['up', 'left', 'right'])
	})

	it('calls onCancel when Escape is pressed and stops listening afterwards', async () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		sensor.activate(new KeyboardEvent('keydown', { key: 'Enter' }), element, callbacks)
		await flushTimers()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		expect(callbacks.onCancel).toHaveBeenCalledTimes(1)

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		expect(callbacks.onNavigate).not.toHaveBeenCalled()
	})

	it('calls onEnd when Enter is pressed a second time and unbinds the listener', async () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		sensor.activate(new KeyboardEvent('keydown', { key: 'Enter' }), element, callbacks)
		await flushTimers()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
		expect(callbacks.onEnd).toHaveBeenCalledTimes(1)

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }))
		expect(callbacks.onNavigate).not.toHaveBeenCalled()
	})

	it('destroy() cancels the deferred listener so a follow-up Enter does not fire onEnd', () => {
		const sensor = new KeyboardSensor()
		const callbacks = spyCallbacks()
		const result = sensor.activate(new KeyboardEvent('keydown', { key: 'Enter' }), element, callbacks)!

		// destroy before the deferred setTimeout(0) attaches the window listener
		result.destroy()

		window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }))
		expect(callbacks.onEnd).not.toHaveBeenCalled()
	})
})
