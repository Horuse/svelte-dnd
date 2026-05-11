import type { DndState } from '../dnd/dnd-state.svelte.js'
import { parseEasing } from './easing.js'

export interface KeyboardFlightPlan {
	duration: number
	update(eased: number): void
	finalize?(): void
}

/** Cancellable rAF runner for keyboard-driven ghost flights. A new `run`/`animateTo` replaces any in-flight. */
export class KeyboardFlight {
	private rafId: number | null = null

	constructor(private state: DndState) {}

	run(plan: KeyboardFlightPlan, easing: string) {
		this.cancel()
		const startTime = performance.now()
		const easeFn = parseEasing(easing)

		const tick = (now: number) => {
			const progress = Math.min((now - startTime) / plan.duration, 1)
			plan.update(easeFn(progress))
			if (progress < 1) {
				this.rafId = requestAnimationFrame(tick)
			} else {
				plan.finalize?.()
				this.rafId = null
			}
		}

		this.rafId = requestAnimationFrame(tick)
	}

	animateTo(target: { x: number; y: number }, options: { duration: number; easing: string }) {
		const start = this.state.transform
		if (!start) {
			this.cancel()
			this.state.setTransform(target)
			return
		}
		const startPos = { x: start.x, y: start.y }
		const state = this.state
		this.run(
			{
				duration: options.duration,
				update(eased) {
					state.setTransform({
						x: startPos.x + (target.x - startPos.x) * eased,
						y: startPos.y + (target.y - startPos.y) * eased
					})
				}
			},
			options.easing
		)
	}

	cancel() {
		if (this.rafId !== null) {
			cancelAnimationFrame(this.rafId)
			this.rafId = null
		}
	}
}
