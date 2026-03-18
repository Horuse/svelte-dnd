import type { AnimationStep } from './animation-step.js'

export class AnimationPipeline implements AnimationStep {
	private steps: AnimationStep[] = []
	private currentIndex = 0
	private cancelled = false

	static chain(...steps: AnimationStep[]): AnimationPipeline {
		const pipeline = new AnimationPipeline()
		pipeline.steps = steps
		return pipeline
	}

	async execute(): Promise<void> {
		for (this.currentIndex = 0; this.currentIndex < this.steps.length; this.currentIndex++) {
			if (this.cancelled) return
			await this.steps[this.currentIndex].execute()
		}
	}

	cancel(): void {
		this.cancelled = true
		if (this.steps[this.currentIndex]) {
			this.steps[this.currentIndex].cancel()
		}
	}
}
