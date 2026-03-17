<script lang="ts">
	import { getContext, onDestroy } from 'svelte'
	import type { DndDragEvent } from '../types.js'
	import type { DragController } from '../core/controller/drag-controller.svelte.js'
	import type { Snippet } from 'svelte'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		id: string
		data?: Record<string, any>
		disabled?: boolean
		onDragStart?: (event: DndDragEvent) => void
		onDrag?: (event: DndDragEvent) => void
		onDragEnd?: (event: DndDragEvent) => void
		children: Snippet
		class?: string
		position: number
		/**
		 * Delay in ms before drag starts on touch devices.
		 * During the delay, finger movement scrolls the container natively (with momentum).
		 * If the finger moves more than `scrollCancelThreshold` px — it's a scroll, not a drag.
		 * @default 300
		 */
		dragDelay?: number
		/**
		 * Max movement in px during `dragDelay` before the gesture is treated as a scroll.
		 * @default 8
		 */
		scrollCancelThreshold?: number
	}

	let {
		id,
		data = {},
		disabled = false,
		class: className,
		onDragStart,
		onDrag,
		onDragEnd,
		children,
		position,
		dragDelay = 300,
		scrollCancelThreshold = 8
	}: Props = $props()

	const dndController = getContext<DragController>('dnd')
	const getContainerId = getContext<(() => string) | undefined>('dnd-container-id')

	let element = $state<HTMLElement | undefined>(undefined)
	let isDragging = $state(false)
	let isPotentialDrag = $state(false)
	let dragStartPosition = $state({ x: 0, y: 0 })
	let dragOffset = $state({ x: 0, y: 0 })
	let dragOccurred = $state(false)

	// Long-press / manual scroll state
	let longPressTimer: ReturnType<typeof setTimeout> | null = null
	let isManualScrolling = false
	let scrollTarget: Element | null = null
	let lastScrollPos = { x: 0, y: 0 }
	let lastScrollTime = 0
	let scrollVelocity = { x: 0, y: 0 }
	let momentumRaf: number | null = null
	let lastPointerPos = { x: 0, y: 0 }
	let lastPointerId = 0

	const DRAG_THRESHOLD = 5

	const translate = $derived(dndController?.translations.get(id) ?? { x: 0, y: 0 })
	const performingDrop = $derived(dndController?.performingDrop ?? false)
	const isGhostActive = $derived(
		isDragging ||
		(dndController?.animatingReturn === true && dndController?.draggedItem === id)
	)

	// --- Manual scroll helpers ---

	const findScrollableParent = (el: HTMLElement): Element | null => {
		let parent = el.parentElement
		while (parent && parent !== document.body) {
			const style = getComputedStyle(parent)
			if (['auto', 'scroll', 'overlay'].includes(style.overflowY) ||
				['auto', 'scroll', 'overlay'].includes(style.overflowX)) {
				return parent
			}
			parent = parent.parentElement
		}
		return document.scrollingElement
	}

	const stopMomentum = () => {
		if (momentumRaf !== null) {
			cancelAnimationFrame(momentumRaf)
			momentumRaf = null
		}
	}

	const applyMomentum = (target: Element) => {
		const DECELERATION = 0.92

		const tick = () => {
			scrollVelocity.x *= DECELERATION
			scrollVelocity.y *= DECELERATION

			if (Math.abs(scrollVelocity.x) < 0.05 && Math.abs(scrollVelocity.y) < 0.05) {
				momentumRaf = null
				return
			}

			target.scrollBy(scrollVelocity.x * 16, scrollVelocity.y * 16)
			momentumRaf = requestAnimationFrame(tick)
		}

		momentumRaf = requestAnimationFrame(tick)
	}

	const startManualScroll = (clientX: number, clientY: number) => {
		isManualScrolling = true
		scrollTarget = findScrollableParent(element!)
		lastScrollPos = { x: clientX, y: clientY }
		lastScrollTime = Date.now()
		scrollVelocity = { x: 0, y: 0 }
		stopMomentum()
	}

	const updateManualScroll = (clientX: number, clientY: number) => {
		if (!scrollTarget) return

		const dx = lastScrollPos.x - clientX
		const dy = lastScrollPos.y - clientY
		const now = Date.now()
		const dt = now - lastScrollTime

		scrollTarget.scrollBy(dx, dy)

		if (dt > 0) {
			// Exponential moving average for smoother velocity
			const alpha = 0.7
			scrollVelocity.x = alpha * (dx / dt) + (1 - alpha) * scrollVelocity.x
			scrollVelocity.y = alpha * (dy / dt) + (1 - alpha) * scrollVelocity.y
		}

		lastScrollPos = { x: clientX, y: clientY }
		lastScrollTime = now
	}

	const endManualScroll = () => {
		isManualScrolling = false
		const target = scrollTarget
		scrollTarget = null
		if (target) applyMomentum(target)
	}

	// --- Long-press helpers ---

	const cancelLongPress = () => {
		if (longPressTimer) {
			clearTimeout(longPressTimer)
			longPressTimer = null
		}
	}

	// --- Drag handling ---

	const handlePointerDown = (e: PointerEvent) => {
		if (disabled) return
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
		const contentBottom = rect.bottom - parseFloat(styles.paddingBottom)
		const contentRight = rect.right - parseFloat(styles.paddingRight)
		const contentTop = rect.top + parseFloat(styles.paddingTop)
		const contentLeft = rect.left + parseFloat(styles.paddingLeft)
		if (e.clientY > contentBottom || e.clientY < contentTop || e.clientX > contentRight || e.clientX < contentLeft) return

		e.stopPropagation()
		stopMomentum()

		isPotentialDrag = true
		dragOccurred = false
		dragStartPosition = { x: e.clientX, y: e.clientY }

		dragOffset = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		}

		const isTouch = e.pointerType === 'touch'
		const effectiveDelay = isTouch ? dragDelay : 0

		lastPointerPos = { x: e.clientX, y: e.clientY }
		lastPointerId = e.pointerId


		if (effectiveDelay > 0) {
			// touch-action: none is always set (CSS), so we own all pointer events.
			// We manually scroll during the delay if the user moves.
			longPressTimer = setTimeout(() => {
				longPressTimer = null
				if (!isPotentialDrag || isManualScrolling) return
				element.setPointerCapture(lastPointerId)
				startActualDrag(lastPointerPos.x, lastPointerPos.y, lastPointerId)
			}, effectiveDelay)
		} else {
			element.setPointerCapture(e.pointerId)
		}
	}

	const addWindowListeners = () => {
		window.addEventListener('pointermove', handleWindowPointerMove)
		window.addEventListener('pointerup', handleWindowPointerUp)
		window.addEventListener('pointercancel', handleWindowPointerCancel)
	}

	const removeWindowListeners = () => {
		window.removeEventListener('pointermove', handleWindowPointerMove)
		window.removeEventListener('pointerup', handleWindowPointerUp)
		window.removeEventListener('pointercancel', handleWindowPointerCancel)
	}

	const startActualDrag = (clientX: number, clientY: number, pointerId: number) => {
		if (isDragging) return

		isDragging = true
		isPotentialDrag = false
		dragOccurred = true

		if (element.hasPointerCapture(pointerId)) {
			element.releasePointerCapture(pointerId)
		}
		addWindowListeners()

		const initialTransform = {
			x: clientX - dragOffset.x,
			y: clientY - dragOffset.y
		}

		dndController?.startDrag(element, id, initialTransform, data)
		dndController?.updateMousePosition?.(clientX, clientY)

		const dragEvent: DndDragEvent = {
			source: { id, element, data },
			target: null,
			transform: initialTransform
		}

		onDragStart?.(dragEvent)
	}

	const handlePointerMove = (e: PointerEvent) => {
		if (!isPotentialDrag && !isManualScrolling) return

		lastPointerPos = { x: e.clientX, y: e.clientY }

		if (!isPotentialDrag) {
			if (isManualScrolling) updateManualScroll(e.clientX, e.clientY)
			return
		}

		const deltaX = Math.abs(e.clientX - dragStartPosition.x)
		const deltaY = Math.abs(e.clientY - dragStartPosition.y)
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

		if (longPressTimer !== null) {
			// Still in delay — check if user is scrolling
			if (distance > scrollCancelThreshold) {
				cancelLongPress()
				isPotentialDrag = false
				startManualScroll(e.clientX, e.clientY)
			}
			return
		}

		if (distance >= DRAG_THRESHOLD) {
			startActualDrag(e.clientX, e.clientY, e.pointerId)
		}
	}

	const handleWindowPointerMove = (e: PointerEvent) => {
		if (!isDragging) return

		const transform = {
			x: e.clientX - dragOffset.x,
			y: e.clientY - dragOffset.y
		}

		dndController?.updateTransform(transform)
		dndController?.updateMousePosition?.(e.clientX, e.clientY)

		const dragEvent: DndDragEvent = {
			source: { id, element, data },
			target: null,
			transform
		}

		onDrag?.(dragEvent)
	}

	const handlePointerUp = (e: PointerEvent) => {
		if (isManualScrolling) {
			endManualScroll()
		}
		if (isPotentialDrag) {
			cancelLongPress()
			isPotentialDrag = false
			return
		}
	}

	const handleWindowPointerUp = (e: PointerEvent) => {
		if (!isDragging) return

		isDragging = false
		removeWindowListeners()

		const dropPreview = dndController?.dropPreview
		if (dropPreview && dropPreview.visible) {
			dndController?.setSkipDropPreviewAnimation(true)
			dndController?.performDrop(id, data, dropPreview.containerId, dropPreview.position)
		} else {
			dndController?.endDrag(true)
		}

		const dragEvent: DndDragEvent = {
			source: { id, element, data },
			target: null,
			transform: { x: 0, y: 0 }
		}

		onDragEnd?.(dragEvent)
	}

	const handlePointerCancel = () => {
		if (isManualScrolling) {
			endManualScroll()
		}
		cancelLongPress()
		isPotentialDrag = false
	}

	const handleWindowPointerCancel = () => {
		if (isDragging) {
			isDragging = false
			removeWindowListeners()
			dndController?.endDrag(false)
		}
	}

	onDestroy(() => {
		cancelLongPress()
		stopMomentum()
	})

	const handleClick = (e: MouseEvent) => {
		if (dragOccurred) {
			e.preventDefault()
			e.stopPropagation()
			dragOccurred = false
		}
	}

	const handleKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			element?.click()
		}
	}
</script>

<div style="position: relative">
	<DndPreview containerId={getContainerId()} {position} />
	<div
			bind:this={element}
			class="dnd-draggable {className ?? ''}"
			class:dnd-draggable--dragging={isGhostActive}
			class:dnd-draggable--disabled={disabled}
			role="button"
			tabindex={disabled ? -1 : 0}
			data-dnd-drag-id={id}
			data-dnd-draggable-item
			style="transform: translate3d({translate.x}px, {translate.y}px, 0); transition: {isGhostActive || performingDrop ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'}"
			onpointerdown={handlePointerDown}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
			onclick={handleClick}
			onkeydown={handleKeyDown}
	>
		{@render children()}
	</div>
</div>

<style>
	.dnd-draggable {
		cursor: var(--dnd-draggable-cursor, grab);
		user-select: none;
		touch-action: none;
		will-change: transform;
	}

	.dnd-draggable:has(:global([data-dnd-handle])) {
		cursor: default;
	}

	.dnd-draggable :global([data-dnd-handle]) {
		cursor: var(--dnd-draggable-cursor, grab);
	}

	.dnd-draggable--dragging {
		cursor: var(--dnd-draggable-cursor-active, grabbing);
		opacity: var(--dnd-draggable-opacity-dragging, 0);
		transition: none;
	}

	.dnd-draggable--dragging :global([data-dnd-handle]) {
		cursor: var(--dnd-draggable-cursor-active, grabbing);
	}

	.dnd-draggable--disabled {
		cursor: var(--dnd-draggable-cursor-disabled, default);
		opacity: var(--dnd-draggable-opacity-disabled, 0.5);
	}
</style>
