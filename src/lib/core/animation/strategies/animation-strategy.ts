export interface AnimationStrategy {
	execute(onComplete?: () => void): void
}
