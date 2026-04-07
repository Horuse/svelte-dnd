import { TouchScroll } from '../scroll/touch-scroll.js'
import { isBrowser } from '../utils/dom-helper.js'
import type { SensorDescriptor, SensorActivation, SensorOptions, SensorCallbacks } from './sensor.js'

const DRAG_THRESHOLD = 5

export class PointerSensor implements SensorDescriptor {
	activate(
		event: Event,
		element: HTMLElement,
		options: SensorOptions,
		callbacks: SensorCallbacks
	): SensorActivation | null {
		if (!(event instanceof PointerEvent)) return null
		if (event.button !== 0) return null

		const e = event

		const target = e.target as HTMLElement
		const hasHandle = !!element.querySelector('[data-dnd-handle]')
		if (hasHandle) {
			if (!target.closest('[data-dnd-handle]')) return null
		} else {
			if (target.closest('[data-dnd-no-drag]')) return null
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
		) return null

		e.stopPropagation()

		const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
		const initialTransform = { x: e.clientX - offset.x, y: e.clientY - offset.y }
		const dragStartPosition = { x: e.clientX, y: e.clientY }
		const lastPointerPos = { x: e.clientX, y: e.clientY }
		let lastPointerId = e.pointerId
		let isPotentialDrag = true
		let isDragging = false
		let longPressTimer: ReturnType<typeof setTimeout> | null = null
		const touchScroll = new TouchScroll()

		touchScroll.stopMomentum()

		const effectiveDelay = e.pointerType === 'touch' ? (options.dragDelay ?? 300) : 0

		const startActualDrag = (clientX: number, clientY: number, pointerId: number) => {
			if (isDragging) return
			isDragging = true
			isPotentialDrag = false

			const el = element
			if (el.hasPointerCapture(pointerId)) {
				el.releasePointerCapture(pointerId)
			}

			if (isBrowser) {
				window.addEventListener('pointermove', onWindowMove)
				window.addEventListener('pointerup', onWindowUp)
				window.addEventListener('pointercancel', onWindowCancel)
			}

			const transform = { x: clientX - offset.x, y: clientY - offset.y }
			callbacks.onStart(transform)
		}

		const cancelLongPress = () => {
			if (longPressTimer) {
				clearTimeout(longPressTimer)
				longPressTimer = null
			}
		}

		const onWindowMove = (e: PointerEvent) => {
			if (!isDragging) return
			const transform = { x: e.clientX - offset.x, y: e.clientY - offset.y }
			callbacks.onMove(transform, e.clientX, e.clientY)
		}

		const onWindowUp = (_e: PointerEvent) => {
			if (!isDragging) return
			isDragging = false
			removeWindowListeners()
			callbacks.onEnd()
		}

		const onWindowCancel = () => {
			if (!isDragging) return
			isDragging = false
			removeWindowListeners()
			callbacks.onCancel()
		}

		const removeWindowListeners = () => {
			if (!isBrowser) return
			window.removeEventListener('pointermove', onWindowMove)
			window.removeEventListener('pointerup', onWindowUp)
			window.removeEventListener('pointercancel', onWindowCancel)
		}

		// Element-level pointermove (before drag starts)
		const onElementMove = (e: PointerEvent) => {
			if (!isPotentialDrag && !touchScroll.isScrolling) return

			lastPointerPos.x = e.clientX
			lastPointerPos.y = e.clientY

			if (!isPotentialDrag) {
				touchScroll.update(e.clientX, e.clientY)
				return
			}

			const deltaX = Math.abs(e.clientX - dragStartPosition.x)
			const deltaY = Math.abs(e.clientY - dragStartPosition.y)
			const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

			if (longPressTimer !== null) {
				if (distance > (options.scrollCancelThreshold ?? 8)) {
					cancelLongPress()
					isPotentialDrag = false
					touchScroll.start(element, e.clientX, e.clientY)
				}
				return
			}

			if (distance >= DRAG_THRESHOLD) {
				startActualDrag(e.clientX, e.clientY, e.pointerId)
			}
		}

		const onElementUp = (e: PointerEvent) => {
			if (element.hasPointerCapture(e.pointerId)) {
				element.releasePointerCapture(e.pointerId)
			}
			if (touchScroll.isScrolling) touchScroll.end()
			if (isPotentialDrag) {
				cancelLongPress()
				isPotentialDrag = false
			}
			element.removeEventListener('pointermove', onElementMove)
			element.removeEventListener('pointerup', onElementUp)
			element.removeEventListener('pointercancel', onElementCancel)
		}

		const onElementCancel = () => {
			if (touchScroll.isScrolling) touchScroll.end()
			cancelLongPress()
			isPotentialDrag = false
			element.removeEventListener('pointermove', onElementMove)
			element.removeEventListener('pointerup', onElementUp)
			element.removeEventListener('pointercancel', onElementCancel)
		}

		element.addEventListener('pointermove', onElementMove)
		element.addEventListener('pointerup', onElementUp)
		element.addEventListener('pointercancel', onElementCancel)

		if (effectiveDelay > 0) {
			longPressTimer = setTimeout(() => {
				longPressTimer = null
				if (!isPotentialDrag || touchScroll.isScrolling) return
				element.setPointerCapture(lastPointerId)
				startActualDrag(lastPointerPos.x, lastPointerPos.y, lastPointerId)
			}, effectiveDelay)
		} else {
			element.setPointerCapture(e.pointerId)
		}

		return {
			initialTransform,
			offset,
			destroy: () => {
				cancelLongPress()
				touchScroll.stopMomentum()
				removeWindowListeners()
				element.removeEventListener('pointermove', onElementMove)
				element.removeEventListener('pointerup', onElementUp)
				element.removeEventListener('pointercancel', onElementCancel)
			}
		}
	}
}
