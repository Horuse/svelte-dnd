import type { DragState } from './drag-state.svelte.js'
import type { DropZone } from '../types.js'
import { ReturnAnimationStrategy } from './animation/strategies/return-animation.js'
import { DropAnimationStrategy } from './animation/strategies/drop-animation.js'

export class AnimationController {
	constructor(private state: DragState) {}

	animateReturn(onComplete?: () => void) {
		const strategy = new ReturnAnimationStrategy(this.state)
		strategy.execute(onComplete)
	}

	animateToTarget(targetZone: DropZone, onComplete?: () => void) {
		const strategy = new DropAnimationStrategy(this.state, targetZone)
		strategy.execute(onComplete)
	}
}
