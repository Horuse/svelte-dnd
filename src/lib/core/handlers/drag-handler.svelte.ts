import type { DndDragEvent } from '../../types.js'
import type { DndController } from '../dnd/dnd-controller.svelte.js'
import { TouchScroll } from '../scroll/touch-scroll.js'

interface DragHandlerCallbacks {
	onDragStart?: (event: DndDragEvent) => void
	onDrag?: (event: DndDragEvent) => void
	onDragEnd?: (event: DndDragEvent) => void
}

interface DragHandlerOptions {
	id: string
	data: Record<string, any>
	dragDelay: number
	scrollCancelThreshold: number
	dndController: DndController | undefined
	callbacks: DragHandlerCallbacks
}

const DRAG_THRESHOLD = 5

export class DragHandler {
	isDragging = $state(false)
	isPotentialDrag = $state(false)
	dragOffset = $state({ x: 0, y: 0 })
	dragOccurred = $state(false)

	private dragStartPosition = { x: 0, y: 0 }
	private longPressTimer: ReturnType<typeof setTimeout> | null = null
	private lastPointerPos = { x: 0, y: 0 }
	private lastPointerId = 0
	private touchScroll = new TouchScroll()

	constructor(
		private getElement: () => HTMLElement | undefined,
		private getOptions: () => DragHandlerOptions
	) {}

	// --- Public event handlers (bound in template) ---

	handlePointerDown = (e: PointerEvent) => {
		const { id, data, dragDelay, dndController, callbacks } = this.getOptions()
		const element = this.getElement()
		if (!element) return
		if (e.button !== 0) return

		const target = e.target as HTMLElement
		const hasHandle = !!element.querySelector('[data-dnd-handle]')
		if (hasHandle) {
			if (!target.closest('[data-dnd-handle]')) return
		} else {
			if (target.closest('[data-dnd-no-drag]')) return
		}

		const rect = element.getBoundingClientRect()
		const styles = getComputedStyle(element)
		const contentTop = rect.top + parseFloat(styles.paddingTop)
		const contentBottom = rect.bottom - parseFloat(styles.paddingBottom)
		const contentLeft = rect.left + parseFloat(styles.paddingLeft)
		const contentRight = rect.right - parseFloat(styles.paddingRight)
		if (
			e.clientY < contentTop || e.clientY > contentBottom ||
			e.clientX < contentLeft || e.clientX > contentRight
		) return

		e.stopPropagation()
		this.touchScroll.stopMomentum()

		this.isPotentialDrag = true
		this.dragOccurred = false
		this.dragStartPosition = { x: e.clientX, y: e.clientY }
		this.dragOffset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
		this.lastPointerPos = { x: e.clientX, y: e.clientY }
		this.lastPointerId = e.pointerId

		const effectiveDelay = e.pointerType === 'touch' ? dragDelay : 0

		if (effectiveDelay > 0) {
			this.longPressTimer = setTimeout(() => {
				this.longPressTimer = null
				if (!this.isPotentialDrag || this.touchScroll.isScrolling) return
				const el = this.getElement()
				if (!el) return
				el.setPointerCapture(this.lastPointerId)
				this.startActualDrag(this.lastPointerPos.x, this.lastPointerPos.y, this.lastPointerId)
			}, effectiveDelay)
		} else {
			element.setPointerCapture(e.pointerId)
		}
	}

	handlePointerMove = (e: PointerEvent) => {
		if (!this.isPotentialDrag && !this.touchScroll.isScrolling) return

		this.lastPointerPos = { x: e.clientX, y: e.clientY }

		if (!this.isPotentialDrag) {
			this.touchScroll.update(e.clientX, e.clientY)
			return
		}

		const deltaX = Math.abs(e.clientX - this.dragStartPosition.x)
		const deltaY = Math.abs(e.clientY - this.dragStartPosition.y)
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

		if (this.longPressTimer !== null) {
			if (distance > this.getOptions().scrollCancelThreshold) {
				this.cancelLongPress()
				this.isPotentialDrag = false
				this.touchScroll.start(this.getElement()!, e.clientX, e.clientY)
			}
			return
		}

		if (distance >= DRAG_THRESHOLD) {
			this.startActualDrag(e.clientX, e.clientY, e.pointerId)
		}
	}

	handlePointerUp = (_e: PointerEvent) => {
		if (this.touchScroll.isScrolling) this.touchScroll.end()
		if (this.isPotentialDrag) {
			this.cancelLongPress()
			this.isPotentialDrag = false
		}
	}

	handlePointerCancel = () => {
		if (this.touchScroll.isScrolling) this.touchScroll.end()
		this.cancelLongPress()
		this.isPotentialDrag = false
	}

	handleWindowPointerMove = (e: PointerEvent) => {
		if (!this.isDragging) return

		const { id, data, callbacks } = this.getOptions()
		const element = this.getElement()
		const dndController = this.getOptions().dndController

		const transform = {
			x: e.clientX - this.dragOffset.x,
			y: e.clientY - this.dragOffset.y
		}

		dndController?.updateTransform(transform)
		dndController?.updateMousePosition?.(e.clientX, e.clientY)

		callbacks.onDrag?.({
			source: { id, element: element!, data },
			target: null,
			transform
		})
	}

	handleWindowPointerUp = (_e: PointerEvent) => {
		if (!this.isDragging) return

		this.isDragging = false
		this.removeWindowListeners()

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

	handleWindowPointerCancel = () => {
		if (!this.isDragging) return
		this.isDragging = false
		this.removeWindowListeners()
		this.getOptions().dndController?.endDrag(false)
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
		this.cancelLongPress()
		this.touchScroll.stopMomentum()
		this.removeWindowListeners()
	}

	// --- Private ---

	private startActualDrag(clientX: number, clientY: number, pointerId: number) {
		if (this.isDragging) return

		this.isDragging = true
		this.isPotentialDrag = false
		this.dragOccurred = true

		const element = this.getElement()!
		if (element.hasPointerCapture(pointerId)) {
			element.releasePointerCapture(pointerId)
		}
		this.addWindowListeners()

		const { id, data, dndController, callbacks } = this.getOptions()
		const initialTransform = {
			x: clientX - this.dragOffset.x,
			y: clientY - this.dragOffset.y
		}

		dndController?.startDrag(element, id, initialTransform, data)
		dndController?.updateMousePosition?.(clientX, clientY)

		callbacks.onDragStart?.({
			source: { id, element, data },
			target: null,
			transform: initialTransform
		})
	}

	private addWindowListeners() {
		window.addEventListener('pointermove', this.handleWindowPointerMove)
		window.addEventListener('pointerup', this.handleWindowPointerUp)
		window.addEventListener('pointercancel', this.handleWindowPointerCancel)
	}

	private removeWindowListeners() {
		window.removeEventListener('pointermove', this.handleWindowPointerMove)
		window.removeEventListener('pointerup', this.handleWindowPointerUp)
		window.removeEventListener('pointercancel', this.handleWindowPointerCancel)
	}

	private cancelLongPress() {
		if (this.longPressTimer) {
			clearTimeout(this.longPressTimer)
			this.longPressTimer = null
		}
	}
}
