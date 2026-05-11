import type { DndState } from '../dnd/dnd-state.svelte.js'
import { parseEasing } from './easing.js'

/** rAF flight of `state.transform` to a target position. Cancellable; a new `animateTo` replaces any in-flight. */
export class KeyboardFlight {
	private rafId: number | null = null

	constructor(private state: DndState) {}

	animateTo(target: { x: number; y: number }, options: { duration: number; easing: string }) {
		this.cancel()

		const start = this.state.transform
		if (!start) {
			this.state.setTransform(target)
			return
		}

		const startPos = { x: start.x, y: start.y }
		const startTime = performance.now()
		const easeFn = parseEasing(options.easing)

		const tick = (now: number) => {
			const progress = Math.min((now - startTime) / options.duration, 1)
			const eased = easeFn(progress)
			this.state.setTransform({
				x: startPos.x + (target.x - startPos.x) * eased,
				y: startPos.y + (target.y - startPos.y) * eased
			})
			if (progress < 1) {
				this.rafId = requestAnimationFrame(tick)
			} else {
				this.rafId = null
			}
		}

		this.rafId = requestAnimationFrame(tick)
	}

	cancel() {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId)
			this.rafId = null
		}
	}
}
