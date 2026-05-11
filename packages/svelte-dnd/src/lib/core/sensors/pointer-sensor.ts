import { TouchScroll } from '../scroll/touch-scroll.js'
import { isBrowser } from '../utils/dom-helper.js'
import type {
	SensorDescriptor,
	SensorActivation,
	SensorCallbacks,
	ActivationState,
	StartCondition,
	StartConditionInput
} from './sensor.js'
import { Distance, Delay } from './activation-constraints.js'

export interface PointerSensorOptions {
	startConditions?: StartConditionInput
}

const DEFAULT_MOUSE_CONDITIONS: StartCondition[] = [new Distance({ value: 5 })]
const DEFAULT_TOUCH_CONDITIONS: StartCondition[] = [new Delay({ value: 300, tolerance: 8 })]

function getDefaultStartConditions(pointerType: string): StartCondition[] {
	if (pointerType === 'mouse') return DEFAULT_MOUSE_CONDITIONS
	return DEFAULT_TOUCH_CONDITIONS
}

function resolveStartConditions(
	event: PointerEvent,
	options: PointerSensorOptions | undefined
): StartCondition[] {
	const input = options?.startConditions
	if (!input) return getDefaultStartConditions(event.pointerType)
	if (typeof input === 'function') return input(event)
	return input
}

export class PointerSensor implements SensorDescriptor {
	constructor(private options?: PointerSensorOptions) {}

	activate(
		event: Event,
		element: HTMLElement,
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
			e.clientY < contentTop ||
			e.clientY > contentBottom ||
			e.clientX < contentLeft ||
			e.clientX > contentRight
		)
			return null

		e.stopPropagation()

		const offset = { x: e.clientX - rect.left, y: e.clientY - rect.top }
		const initialTransform = { x: e.clientX - offset.x, y: e.clientY - offset.y }

		const conditions = resolveStartConditions(e, this.options)
		const startTime = performance.now()

		const state: ActivationState = {
			startX: e.clientX,
			startY: e.clientY,
			currentX: e.clientX,
			currentY: e.clientY,
			elapsedMs: 0,
			pointerType: e.pointerType as 'mouse' | 'touch' | 'pen'
		}

		let isDragging = false
		let isPotentialDrag = true
		const lastPointerId = e.pointerId
		const lastPointerPos = { x: e.clientX, y: e.clientY }
		let conditionTimer: ReturnType<typeof setTimeout> | null = null
		const touchScroll = new TouchScroll()

		touchScroll.stopMomentum()

		const startActualDrag = (clientX: number, clientY: number, pointerId: number) => {
			if (isDragging) return
			isDragging = true
			isPotentialDrag = false

			if (element.hasPointerCapture(pointerId)) {
				element.releasePointerCapture(pointerId)
			}

			if (isBrowser) {
				window.addEventListener('pointermove', onWindowMove)
				window.addEventListener('pointerup', onWindowUp)
				window.addEventListener('pointercancel', onWindowCancel)
			}

			const transform = { x: clientX - offset.x, y: clientY - offset.y }
			callbacks.onStart(transform)
		}

		const cancelTimer = () => {
			if (conditionTimer) {
				clearTimeout(conditionTimer)
				conditionTimer = null
			}
		}

		const evaluateConditions = (): 'satisfied' | 'pending' | 'all_aborted' => {
			let allAborted = true

			for (const condition of conditions) {
				const result = condition.evaluate(state)
				if (result === 'satisfied') return 'satisfied'
				if (result !== 'aborted') allAborted = false
			}

			return allAborted ? 'all_aborted' : 'pending'
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

		const onElementMove = (e: PointerEvent) => {
			if (!isPotentialDrag && !touchScroll.isScrolling) return

			lastPointerPos.x = e.clientX
			lastPointerPos.y = e.clientY

			if (!isPotentialDrag) {
				touchScroll.update(e.clientX, e.clientY)
				return
			}

			state.currentX = e.clientX
			state.currentY = e.clientY
			state.elapsedMs = performance.now() - startTime

			const result = evaluateConditions()

			if (result === 'satisfied') {
				cancelTimer()
				startActualDrag(e.clientX, e.clientY, e.pointerId)
			} else if (result === 'all_aborted') {
				cancelTimer()
				isPotentialDrag = false
				touchScroll.start(element, e.clientX, e.clientY)
			}
		}

		const onElementUp = (e: PointerEvent) => {
			if (element.hasPointerCapture(e.pointerId)) {
				element.releasePointerCapture(e.pointerId)
			}
			if (touchScroll.isScrolling) touchScroll.end()
			if (isPotentialDrag) {
				cancelTimer()
				isPotentialDrag = false
			}
			element.removeEventListener('pointermove', onElementMove)
			element.removeEventListener('pointerup', onElementUp)
			element.removeEventListener('pointercancel', onElementCancel)
		}

		const onElementCancel = () => {
			if (touchScroll.isScrolling) touchScroll.end()
			cancelTimer()
			isPotentialDrag = false
			element.removeEventListener('pointermove', onElementMove)
			element.removeEventListener('pointerup', onElementUp)
			element.removeEventListener('pointercancel', onElementCancel)
		}

		element.addEventListener('pointermove', onElementMove)
		element.addEventListener('pointerup', onElementUp)
		element.addEventListener('pointercancel', onElementCancel)

		// Set timer for the minimum required duration among all conditions
		const durations = conditions
			.map((c) => c.getRequiredDuration?.())
			.filter((d): d is number => d !== null && d !== undefined)
		const minDuration = durations.length > 0 ? Math.min(...durations) : null

		if (minDuration !== null && minDuration > 0) {
			conditionTimer = setTimeout(() => {
				conditionTimer = null
				if (!isPotentialDrag || touchScroll.isScrolling) return

				state.elapsedMs = performance.now() - startTime
				const result = evaluateConditions()

				if (result === 'satisfied') {
					element.setPointerCapture(lastPointerId)
					startActualDrag(lastPointerPos.x, lastPointerPos.y, lastPointerId)
				} else if (result === 'all_aborted') {
					isPotentialDrag = false
					touchScroll.start(element, lastPointerPos.x, lastPointerPos.y)
				}
			}, minDuration)
		}

		return {
			initialTransform,
			offset,
			destroy: () => {
				cancelTimer()
				touchScroll.stopMomentum()
				removeWindowListeners()
				element.removeEventListener('pointermove', onElementMove)
				element.removeEventListener('pointerup', onElementUp)
				element.removeEventListener('pointercancel', onElementCancel)
			}
		}
	}
}
