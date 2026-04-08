import type { SensorDescriptor, SensorActivation, SensorCallbacks, NavigationDirection } from './sensor.js'

export class KeyboardSensor implements SensorDescriptor {
	activate(
		event: Event,
		element: HTMLElement,
		callbacks: SensorCallbacks
	): SensorActivation | null {
		if (!(event instanceof KeyboardEvent)) return null
		if (event.key !== 'Enter' && event.key !== ' ') return null

		event.preventDefault()
		event.stopPropagation()

		const rect = element.getBoundingClientRect()
		const offset = { x: rect.width / 2, y: rect.height / 2 }
		const initialTransform = { x: rect.left, y: rect.top }

		let started = false

		const keyToDirection: Record<string, NavigationDirection> = {
			ArrowUp: 'up',
			ArrowDown: 'down',
			ArrowLeft: 'left',
			ArrowRight: 'right'
		}

		const onWindowKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				cleanup()
				callbacks.onCancel()
				return
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				cleanup()
				callbacks.onEnd()
				return
			}

			const direction = keyToDirection[e.key]
			if (direction) {
				e.preventDefault()
				if (!started) {
					callbacks.onStart(initialTransform)
					started = true
				}
				callbacks.onNavigate?.(direction)
			}
		}

		// Defer listener so the current Enter keydown event doesn't immediately trigger onEnd
		setTimeout(() => window.addEventListener('keydown', onWindowKeyDown), 0)

		// Start drag immediately on Enter/Space
		callbacks.onStart(initialTransform)
		started = true

		function cleanup() {
			window.removeEventListener('keydown', onWindowKeyDown)
		}

		return { initialTransform, offset, destroy: cleanup }
	}
}
