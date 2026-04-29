/**
 * Tuning knobs for built-in drag animations.
 * All values are in milliseconds.
 */
export interface AnimationConfig {
	/** Ghost flight to a sortable slot or target zone. Default: 250 */
	dropDuration?: number
	/** Ghost return animation when a drag is cancelled or rejected. Default: 300 */
	returnDuration?: number
	/** Source slot collapse during a cross-container drop. Default: 250 */
	slotCollapseDuration?: number
	/** Default duration for `simulateSwap` and `simulateBatchSwap`. Default: 300 */
	swapDuration?: number
}

export interface ResolvedAnimationConfig {
	dropDuration: number
	returnDuration: number
	slotCollapseDuration: number
	swapDuration: number
}

export const DEFAULT_ANIMATION_CONFIG: ResolvedAnimationConfig = {
	dropDuration: 250,
	returnDuration: 300,
	slotCollapseDuration: 250,
	swapDuration: 300
}

export function resolveAnimationConfig(config?: AnimationConfig): ResolvedAnimationConfig {
	return {
		dropDuration: config?.dropDuration ?? DEFAULT_ANIMATION_CONFIG.dropDuration,
		returnDuration: config?.returnDuration ?? DEFAULT_ANIMATION_CONFIG.returnDuration,
		slotCollapseDuration: config?.slotCollapseDuration ?? DEFAULT_ANIMATION_CONFIG.slotCollapseDuration,
		swapDuration: config?.swapDuration ?? DEFAULT_ANIMATION_CONFIG.swapDuration
	}
}
