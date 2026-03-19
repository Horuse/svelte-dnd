export interface AnimationStep {
	execute(onProgress?: (progress: number) => void): Promise<void>
	cancel(): void
}

export class InstantStep implements AnimationStep {
	execute(): Promise<void> {
		return Promise.resolve()
	}
	cancel(): void {}
}
