<script lang="ts">
	import { getContext } from 'svelte'
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
		position
	}: Props = $props()

	const dndController = getContext<DragController>('dnd')
	const getContainerId = getContext<(() => string) | undefined>('dnd-container-id')

	let element = $state<HTMLElement | undefined>(undefined)
	let isDragging = $state(false)
	let isPotentialDrag = $state(false)
	let dragStartPosition = $state({ x: 0, y: 0 })
	let dragOffset = $state({ x: 0, y: 0 })
	let dragOccurred = $state(false)

	const DRAG_THRESHOLD = 5

	const translate = $derived(dndController?.translations.get(id) ?? { x: 0, y: 0 })
	const performingDrop = $derived(dndController?.performingDrop ?? false)
	const isGhostActive = $derived(
		isDragging ||
		(dndController?.animatingReturn === true && dndController?.draggedItem === id)
	)

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

		isPotentialDrag = true
		dragOccurred = false
		dragStartPosition = { x: e.clientX, y: e.clientY }

		dragOffset = {
			x: e.clientX - rect.left,
			y: e.clientY - rect.top
		}

		element.setPointerCapture(e.pointerId)
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

	const startActualDrag = (e: PointerEvent) => {
		if (isDragging) return

		isDragging = true
		isPotentialDrag = false
		dragOccurred = true

		if (element.hasPointerCapture(e.pointerId)) {
			element.releasePointerCapture(e.pointerId)
		}
		addWindowListeners()

		const initialTransform = {
			x: e.clientX - dragOffset.x,
			y: e.clientY - dragOffset.y
		}

		dndController?.startDrag(element, id, initialTransform, data)
		dndController?.updateMousePosition?.(e.clientX, e.clientY)

		const dragEvent: DndDragEvent = {
			source: { id, element, data },
			target: null,
			transform: initialTransform
		}

		onDragStart?.(dragEvent)
	}

	const handlePointerMove = (e: PointerEvent) => {
		if (!isPotentialDrag) return

		const deltaX = Math.abs(e.clientX - dragStartPosition.x)
		const deltaY = Math.abs(e.clientY - dragStartPosition.y)
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)

		if (distance >= DRAG_THRESHOLD) {
			startActualDrag(e)
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
		if (isPotentialDrag) {
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
		isPotentialDrag = false
	}

	const handleWindowPointerCancel = () => {
		if (isDragging) {
			isDragging = false
			removeWindowListeners()
			dndController?.endDrag(false)
		}
	}

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