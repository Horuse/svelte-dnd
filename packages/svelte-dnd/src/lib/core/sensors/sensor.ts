export type NavigationDirection = 'up' | 'down' | 'left' | 'right' | 'home' | 'end'

export interface SensorCallbacks {
	onStart: (transform: { x: number; y: number }) => void
	onMove: (transform: { x: number; y: number }, mouseX: number, mouseY: number) => void
	onEnd: () => void
	onCancel: () => void
	onNavigate?: (direction: NavigationDirection) => void
}

export interface SensorActivation {
	/** Initial position of the ghost element */
	initialTransform: { x: number; y: number }
	/** Offset from the element's top-left corner to the pointer */
	offset: { x: number; y: number }
	/** Cancel pending timers/listeners if drag never started */
	destroy: () => void
}

export interface ActivationState {
	startX: number
	startY: number
	currentX: number
	currentY: number
	elapsedMs: number
	pointerType: 'mouse' | 'touch' | 'pen'
}

export type ConditionResult = 'satisfied' | 'pending' | 'aborted'

export interface StartCondition {
	evaluate(state: ActivationState): ConditionResult
	getRequiredDuration?(): number | null
}

export type StartConditionInput = StartCondition[] | ((event: PointerEvent) => StartCondition[])

export interface SensorDescriptor {
	activate(
		event: Event,
		element: HTMLElement,
		callbacks: SensorCallbacks
	): SensorActivation | null
}
