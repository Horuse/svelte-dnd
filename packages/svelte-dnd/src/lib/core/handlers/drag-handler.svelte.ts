import type { DndDragEvent } from '../../types.js'
import type { DndController } from '../dnd/dnd-controller.svelte.js'
import type { SensorDescriptor, SensorActivation } from '../sensors/sensor.js'
import { PointerSensor } from '../sensors/pointer-sensor.js'

interface DragHandlerCallbacks {
	onDragStart?: (event: DndDragEvent) => void
	onDrag?: (event: DndDragEvent) => void
	onDragEnd?: (event: DndDragEvent) => void
}

interface DragHandlerOptions {
	id: string
	type: string | undefined
	data: Record<string, unknown>
	disabled: boolean
	dragDelay: number
	scrollCancelThreshold: number
	dndController: DndController | undefined
	callbacks: DragHandlerCallbacks
	sensors?: SensorDescriptor[]
}

const DEFAULT_SENSORS: SensorDescriptor[] = [new PointerSensor()]

export class DragHandler {
	isDragging = $state(false)
	dragOccurred = $state(false)

	private dragOffset = { x: 0, y: 0 }
	private activeActivation: SensorActivation | null = null

	constructor(
		private getElement: () => HTMLElement | undefined,
		private getOptions: () => DragHandlerOptions
	) {}

	// --- Public event handlers (bound in template) ---

	handlePointerDown = (e: PointerEvent) => {
		const options = this.getOptions()
		if (options.disabled) return
		const element = this.getElement()
		if (!element) return

		const sensors = options.sensors ?? DEFAULT_SENSORS

		for (const sensor of sensors) {
			const activation = sensor.activate(e, element, {
				dragDelay: options.dragDelay,
				scrollCancelThreshold: options.scrollCancelThreshold
			}, {
				onStart: (transform) => {
					this.dragOffset = activation!.offset
					this.startDragSession(transform)
				},
				onMove: (transform, mouseX, mouseY) => {
					this.handleDragMove(transform, mouseX, mouseY)
				},
				onEnd: () => {
					this.handleDragEnd()
				},
				onCancel: () => {
					this.handleDragCancel()
				}
			})

			if (activation) {
				this.activeActivation = activation
				this.dragOffset = activation.offset
				break
			}
		}
	}

	handleClick = (e: MouseEvent) => {
		if (this.dragOccurred) {
			e.preventDefault()
			e.stopPropagation()
			this.dragOccurred = false
		}
	}

	handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			this.getElement()?.click()
		}
	}

	destroy() {
		this.activeActivation?.destroy()
		this.activeActivation = null
	}

	// --- Private ---

	private startDragSession(initialTransform: { x: number; y: number }) {
		if (this.isDragging) return
		this.isDragging = true
		this.dragOccurred = true

		const { id, type, data, dndController, callbacks } = this.getOptions()
		const element = this.getElement()!

		dndController?.startDrag(element, id, initialTransform, data, type)
		dndController?.updateMousePosition?.(
			initialTransform.x + this.dragOffset.x,
			initialTransform.y + this.dragOffset.y
		)

		callbacks.onDragStart?.({
			source: { id, element, data },
			target: null,
			transform: initialTransform
		})
	}

	private handleDragMove(transform: { x: number; y: number }, mouseX: number, mouseY: number) {
		if (!this.isDragging) return
		const { id, data, dndController, callbacks } = this.getOptions()
		const element = this.getElement()

		dndController?.updateTransform(transform)
		dndController?.updateMousePosition?.(mouseX, mouseY)

		callbacks.onDrag?.({
			source: { id, element: element!, data },
			target: null,
			transform
		})
	}

	private handleDragEnd() {
		if (!this.isDragging) return
		this.isDragging = false
		this.activeActivation = null

		const { id, data, dndController, callbacks } = this.getOptions()
		const element = this.getElement()

		const dropPreview = dndController?.dropPreview
		if (dropPreview?.visible) {
			dndController?.setSkipDropPreviewAnimation(true)
			dndController?.performDrop(id, data, dropPreview.containerId, dropPreview.position)
		} else {
			dndController?.endDrag(true)
		}

		callbacks.onDragEnd?.({
			source: { id, element: element!, data },
			target: null,
			transform: { x: 0, y: 0 }
		})
	}

	private handleDragCancel() {
		if (!this.isDragging) return
		this.isDragging = false
		this.activeActivation = null
		this.getOptions().dndController?.endDrag(false)
	}
}
