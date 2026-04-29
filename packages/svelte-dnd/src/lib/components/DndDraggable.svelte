<script lang="ts">
	import { getContext } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { SensorDescriptor } from '../core/sensors/sensor.js'
	import type { Snippet } from 'svelte'
	import type { Droppable } from '../core/entities/droppable.svelte.js'
	import { Slot } from '../core/entities/slot.js'
	import { Draggable } from '../core/entities/draggable.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		/** Unique item identifier. */
		id: string
		/** Item type; matched against the target droppable's `accepts` filter. */
		type?: string
		/** Arbitrary data attached to the item, surfaced on drag/drop events. */
		data?: Record<string, unknown>
		/** When `true`, dragging is prevented. */
		disabled?: boolean
		/** Per-item sensor override; falls back to the controller's sensors. */
		sensors?: SensorDescriptor[]
		children: Snippet
		/** CSS class forwarded to the draggable element. */
		class?: string
		/** Zero-based index of this item within its parent container's list. Required for `sortable` mode. */
		position?: number
	}

	let {
		id,
		type = undefined,
		data = {},
		disabled = false,
		sensors = undefined,
		class: className,
		children,
		position = undefined
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')
	const droppable = getContext<Droppable>('dnd-droppable')
	if (!dndController) {
		throw new Error('[svelte-dnd] <DndDraggable> must be rendered inside a <DndProvider>.')
	}
	if (!droppable) {
		throw new Error('[svelte-dnd] <DndDraggable> must be rendered inside a <DndDroppable>.')
	}
	const positionRegistry = getContext<Map<number, string> | undefined>('dnd-position-registry')

	$effect(() => {
		if (!dndController?.debug) return
		if (position === undefined) return
		if (!Number.isInteger(position) || position < 0) {
			console.warn(`[svelte-dnd] DndDraggable "${id}": invalid position ${position}. Must be a non-negative integer.`)
		}
		if (positionRegistry) {
			const pos = position
			const existing = positionRegistry.get(pos)
			if (existing !== undefined && existing !== id) {
				console.warn(`[svelte-dnd] DndDraggable "${id}": duplicate position ${pos} — already used by "${existing}". Reordering will be unpredictable.`)
			}
			positionRegistry.set(pos, id)
			return () => { if (positionRegistry.get(pos) === id) positionRegistry.delete(pos) }
		}
	})

	const slot = new Slot(position ?? 0)

	// Keep slot.position in sync with the reactive position prop — Slot is a plain class,
	// so without this {#each} reorders leave slot.position stale and getSortedSlots() returns
	// wrong order on subsequent drags.
	$effect(() => { slot.position = position ?? 0 })

	const draggable = new Draggable(
		{ id, type, data, disabled, sensors },
		dndController
	)

	$effect(() => { draggable.type = type })
	$effect(() => { draggable.data = data })
	$effect(() => { draggable.disabled = disabled })
	$effect(() => { draggable.sensors = sensors })

	// Separate ref for click-capture effect (draggable.element is set via @attach, not reactive)
	let draggableEl = $state<HTMLElement | undefined>(undefined)

	const translate = $derived(dndController?.translations.get(id) ?? { x: 0, y: 0 })

	// Suppress spacing margin on the last slot unless the tail preview is active.
	// When the tail preview is active, the last slot needs its margin so the preview has visual space.
	const suppressSpacing = $derived.by(() => {
		if (position === undefined || !droppable) return false
		const isLast = position === droppable.slots.size - 1
		if (!isLast) return false
		const preview = dndController?.dropPreview
		const tailActive = preview && preview.containerId === droppable.id && preview.position === droppable.slots.size
		return !tailActive
	})

	const spacingPx = $derived.by(() => {
		if (suppressSpacing || droppable?.spacing === undefined) return 0
		return droppable.spacing
	})
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

<div class="dnd-slot" data-dnd-slot style="position: relative; overflow: visible; {droppable?.layout === 'grid' ? '' : droppable?.layout === 'horizontal' ? `margin-right: ${spacingPx}px` : `margin-bottom: ${spacingPx}px`}" {@attach droppable?.attachSlot(slot)}>
	{#if position !== undefined}
		<DndPreview {slot} {position} />
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
