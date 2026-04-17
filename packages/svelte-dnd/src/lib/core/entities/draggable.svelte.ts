import type { SensorDescriptor, SensorActivation } from '../sensors/sensor.js'
import { PointerSensor } from '../sensors/pointer-sensor.js'
import type { Slot } from './slot.js'

// Forward declaration — resolved at runtime to avoid circular imports
export type DraggableControllerRef = {
	session: { source: Draggable } | null
	sensors: SensorDescriptor[] | undefined
	startSession(draggable: Draggable, initialTransform: { x: number; y: number }): void
	updateTransform(transform: { x: number; y: number }): void
	updateMousePosition?(mouseX: number, mouseY: number): void
	navigate(direction: import('../sensors/sensor.js').NavigationDirection): void
	dropPreview: import('../../types.js').DropPreview | null
	setSkipDropPreviewAnimation(value: boolean): void
	performDrop(sourceId: string, sourceData: Record<string, unknown> | undefined, targetContainerId: string, position: number): void
	endDrag(shouldAnimate?: boolean): void
}

interface DraggableConfig {
	id: string
	data?: Record<string, unknown>
	type?: string
	disabled?: boolean
	sensors?: SensorDescriptor[]
}

const DEFAULT_SENSORS: SensorDescriptor[] = [new PointerSensor()]

export class Draggable {
	element!: HTMLElement
	slot!: Slot

	id: string
	data: Record<string, unknown> | undefined
	type: string | undefined
	disabled: boolean
	sensors: SensorDescriptor[] | undefined

	isDragging = $state(false)
	dragOccurred = $state(false)
	translate = $state({ x: 0, y: 0 })

	private dragOffset = { x: 0, y: 0 }
	private activeActivation: SensorActivation | null = null
	private controller: DraggableControllerRef

	constructor(config: DraggableConfig, controller: DraggableControllerRef) {
		this.id = config.id
		this.data = config.data
		this.type = config.type
		this.disabled = config.disabled ?? false
		this.sensors = config.sensors
		this.controller = controller
	}

	get isDraggingSession() {
		return this.controller.session?.source === this
	}

	getCenter(): { x: number; y: number } {
		const rect = this.element.getBoundingClientRect()
		return {
			x: rect.left + rect.width / 2,
			y: rect.top + rect.height / 2
		}
	}

	// --- Public event handlers (bound in template) ---

	handlePointerDown = (e: PointerEvent) => {
		if (this.disabled) return
		if (!this.element) return

		const sensors = this.getSensors()

		for (const sensor of sensors) {
			const activationRef = { current: null as SensorActivation | null }
			const activation = sensor.activate(e, this.element, {
				onStart: (transform) => {
					this.dragOffset = activationRef.current?.offset ?? { x: 0, y: 0 }
					this.startDragSession(transform)
				},
				onMove: (transform, mouseX, mouseY) => {
					this.handleDragMove(transform, mouseX, mouseY)
				},
				onEnd: () => { this.handleDragEnd() },
				onCancel: () => { this.handleDragCancel() },
				onNavigate: (direction) => { this.controller.navigate(direction) }
			})

			if (activation) {
				activationRef.current = activation
				this.activeActivation = activation
				this.dragOffset = activation.offset
				break
			}
		}
	}

	handleKeyDown = (e: KeyboardEvent) => {
		if (this.isDragging) return
		if (this.disabled) return
		if (!this.element) return

		const sensors = this.getSensors()
		let handled = false

		for (const sensor of sensors) {
			const activationRef = { current: null as SensorActivation | null }
			const activation = sensor.activate(e, this.element, {
				onStart: (transform) => {
					this.dragOffset = activationRef.current?.offset ?? { x: 0, y: 0 }
					this.startDragSession(transform)
				},
				onMove: (transform, mouseX, mouseY) => {
					this.handleDragMove(transform, mouseX, mouseY)
				},
				onEnd: () => { this.handleDragEnd() },
				onCancel: () => { this.handleDragCancel() },
				onNavigate: (direction) => { this.controller.navigate(direction) }
			})

			if (activation) {
				activationRef.current = activation
				this.activeActivation = activation
				this.dragOffset = activation.offset
				handled = true
				break
			}
		}

		// Fallback: Enter/Space triggers click for non-DnD keyboard interactions
		if (!handled && (e.key === 'Enter' || e.key === ' ')) {
			this.element.click()
		}
	}

	destroy() {
		this.activeActivation?.destroy()
		this.activeActivation = null
	}

	// --- Private ---

	private getSensors(): SensorDescriptor[] {
		if (this.sensors) return this.sensors
		if (this.controller.sensors) return this.controller.sensors
		return DEFAULT_SENSORS
	}

	private startDragSession(initialTransform: { x: number; y: number }) {
		if (this.isDragging) return
		this.isDragging = true
		this.dragOccurred = true

		this.controller.startSession(this, initialTransform)
		this.controller.updateMousePosition?.(
			initialTransform.x + this.dragOffset.x,
			initialTransform.y + this.dragOffset.y
		)
	}

	private handleDragMove(transform: { x: number; y: number }, mouseX: number, mouseY: number) {
		if (!this.isDragging) return

		this.controller.updateTransform(transform)
		this.controller.updateMousePosition?.(mouseX, mouseY)
	}

	private handleDragEnd() {
		if (!this.isDragging) return
		this.isDragging = false
		this.activeActivation = null

		const dropPreview = this.controller.dropPreview
		if (dropPreview) {
			this.controller.setSkipDropPreviewAnimation(true)
			this.controller.performDrop(this.id, this.data, dropPreview.containerId, dropPreview.position)
		} else {
			this.controller.endDrag(true)
		}
	}

	private handleDragCancel() {
		if (!this.isDragging) return
		this.isDragging = false
		this.activeActivation = null
		this.controller.endDrag(false)
	}
}
