export interface SensorCallbacks {
	onStart: (transform: { x: number; y: number }) => void
	onMove: (transform: { x: number; y: number }, mouseX: number, mouseY: number) => void
	onEnd: () => void
	onCancel: () => void
}

export interface SensorActivation {
	/** Initial position of the ghost element */
	initialTransform: { x: number; y: number }
	/** Offset from the element's top-left corner to the pointer */
	offset: { x: number; y: number }
	/** Cancel pending timers/listeners if drag never started */
	destroy: () => void
}

export interface SensorOptions {
	dragDelay?: number
	scrollCancelThreshold?: number
}

export interface SensorDescriptor {
	activate(
		event: Event,
		element: HTMLElement,
		options: SensorOptions,
		callbacks: SensorCallbacks
	): SensorActivation | null
}
