import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { DropZone } from '../../types.js'
import { ReturnAnimationStrategy } from './strategies/return-animation.js'
import { DropAnimationStrategy } from './strategies/drop-animation.js'

export class AnimationController {
	constructor(private state: DndState) {}

	animateReturn(onComplete?: () => void) {
		const strategy = new ReturnAnimationStrategy(this.state)
		strategy.execute(onComplete)
	}

	animateToTarget(targetZone: DropZone, onComplete?: () => void) {
		const strategy = new DropAnimationStrategy(this.state, targetZone)
		strategy.execute(onComplete)
	}
}
