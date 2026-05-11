import type { StartCondition, ActivationState, ConditionResult } from './sensor.js'

export interface DistanceConfig {
	value: number
	tolerance?: number
}

export class Distance implements StartCondition {
	constructor(private config: DistanceConfig) {}

	evaluate(state: ActivationState): ConditionResult {
		const dx = Math.abs(state.currentX - state.startX)
		const dy = Math.abs(state.currentY - state.startY)
		const distance = Math.sqrt(dx * dx + dy * dy)

		if (this.config.tolerance !== undefined && distance > this.config.tolerance) {
			return 'aborted'
		}

		if (distance >= this.config.value) {
			return 'satisfied'
		}

		return 'pending'
	}

	getRequiredDuration(): number | null {
		return null
	}
}

export interface DelayConfig {
	value: number
	tolerance?: number
}

export class Delay implements StartCondition {
	constructor(private config: DelayConfig) {}

	evaluate(state: ActivationState): ConditionResult {
		const dx = Math.abs(state.currentX - state.startX)
		const dy = Math.abs(state.currentY - state.startY)
		const distance = Math.sqrt(dx * dx + dy * dy)

		if (this.config.tolerance !== undefined && distance > this.config.tolerance) {
			return 'aborted'
		}

		if (state.elapsedMs >= this.config.value) {
			return 'satisfied'
		}

		return 'pending'
	}

	getRequiredDuration(): number | null {
		return this.config.value
	}
}
