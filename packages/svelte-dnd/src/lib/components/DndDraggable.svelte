<script lang="ts">
	import { getContext } from 'svelte'
	import type { DndDragEvent } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { SensorDescriptor } from '../core/sensors/sensor.js'
	import type { Snippet } from 'svelte'
	import type { Droppable } from '../core/entities/droppable.svelte.js'
	import { Slot } from '../core/entities/slot.js'
	import { Draggable } from '../core/entities/draggable.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		id: string
		type?: string
		data?: Record<string, unknown>
		disabled?: boolean
		sensors?: SensorDescriptor[]
		onDragStart?: (event: DndDragEvent) => void
		onDrag?: (event: DndDragEvent) => void
		onDragEnd?: (event: DndDragEvent) => void
		children: Snippet
		class?: string
		position?: number
	}

	let {
		id,
		type = undefined,
		data = {},
		disabled = false,
		sensors = undefined,
		class: className,
		onDragStart,
		onDrag,
		onDragEnd,
		children,
		position = undefined
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')
	const droppable = getContext<Droppable>('dnd-droppable')
	const positionRegistry = getContext<Map<number, string> | undefined>('dnd-position-registry')

	$effect(() => {
		if (!dndController?.debug) return
		if (position !== undefined && (!Number.isInteger(position) || position < 0)) {
			console.warn(`[svelte-dnd] DndDraggable "${id}": invalid position ${position}. Must be a non-negative integer.`)
		}
		if (positionRegistry) {
			const existing = positionRegistry.get(position)
			if (existing !== undefined && existing !== id) {
				console.warn(`[svelte-dnd] DndDraggable "${id}": duplicate position ${position} — already used by "${existing}". Reordering will be unpredictable.`)
			}
			positionRegistry.set(position, id)
			return () => { if (positionRegistry.get(position) === id) positionRegistry.delete(position) }
		}
	})

	const slot = new Slot(position ?? 0)
	const draggable = new Draggable(
		{ id, type, data, disabled, sensors, onDragStart, onDrag, onDragEnd },
		dndController
	)

	// Separate ref for click-capture effect (draggable.element is set via @attach, not reactive)
	let draggableEl = $state<HTMLElement | undefined>(undefined)

	const translate = $derived(dndController?.translations.get(id) ?? { x: 0, y: 0 })
	const performingDrop = $derived(dndController?.performingDrop ?? false)
	const isGhostActive = $derived(
		draggable.isDragging ||
		(dndController?.animatingReturn === true && dndController?.draggedItem === id) ||
		(dndController?.performingDrop === true && dndController?.draggedItem === id)
	)

	// Block clicks after drag in capture phase — fires before any child onclick handlers.
	$effect(() => {
		if (!draggableEl) return
		const onClickCapture = (e: MouseEvent) => {
			if (draggable.dragOccurred) {
				e.stopPropagation()
				e.preventDefault()
				draggable.dragOccurred = false
			}
		}
		draggableEl.addEventListener('click', onClickCapture, true)
		return () => draggableEl!.removeEventListener('click', onClickCapture, true)
	})
</script>

<div data-dnd-slot style="position: relative; overflow: visible" {@attach droppable?.attachSlot(slot)}>
	{#if position !== undefined}
		<DndPreview {slot} translateX={translate.x} translateY={translate.y} />
	{/if}

	<div
		bind:this={draggableEl}
		class="dnd-draggable {className ?? ''}"
		class:dnd-draggable--dragging={isGhostActive}
		class:dnd-draggable--disabled={disabled}
		role="button"
		tabindex={disabled ? -1 : 0}
		aria-grabbed={isGhostActive}
		aria-roledescription="draggable item"
		data-dnd-draggable
		data-dnd-drag-id={id}
		style="transform: translate3d({translate.x}px, {translate.y}px, 0); transition: {isGhostActive || performingDrop ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'}"
		onpointerdown={draggable.handlePointerDown}
		onkeydown={draggable.handleKeyDown}
		{@attach slot.attachDraggable(draggable)}
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
