<script lang="ts">
	import { getContext, onDestroy } from 'svelte'
	import type { DndDragEvent } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { Snippet } from 'svelte'
	import DndPreview from './DndPreview.svelte'
	import { DragHandler } from '../core/handlers/drag-handler.svelte.js'

	interface Props {
		id: string
		type?: string
		data?: Record<string, unknown>
		disabled?: boolean
		onDragStart?: (event: DndDragEvent) => void
		onDrag?: (event: DndDragEvent) => void
		onDragEnd?: (event: DndDragEvent) => void
		children: Snippet
		class?: string
		position: number
		/**
		 * Delay in ms before drag starts on touch devices.
		 * During the delay, finger movement scrolls the container manually (with momentum).
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
		type = undefined,
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

	const dndController = getContext<DndController>('dnd')
	const getContainerId = getContext<(() => string)>('dnd-container-id')
	const positionRegistry = getContext<Map<number, string> | undefined>('dnd-position-registry')

	$effect(() => {
		if (!dndController?.debug) return
		if (!Number.isInteger(position) || position < 0) {
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

	let element = $state<HTMLElement | undefined>(undefined)

	const handler = new DragHandler(
		() => element,
		() => ({ id, type, data, dragDelay, scrollCancelThreshold, dndController, callbacks: { onDragStart, onDrag, onDragEnd } })
	)

	const translate = $derived(dndController?.translations.get(id) ?? { x: 0, y: 0 })
	const performingDrop = $derived(dndController?.performingDrop ?? false)
	const isGhostActive = $derived(
		handler.isDragging ||
		(dndController?.animatingReturn === true && dndController?.draggedItem === id) ||
		(dndController?.performingDrop === true && dndController?.draggedItem === id)
	)

	onDestroy(() => handler.destroy())
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
		aria-grabbed={isGhostActive}
		aria-roledescription="draggable item"
		data-dnd-drag-id={id}
		data-dnd-draggable-item
		style="transform: translate3d({translate.x}px, {translate.y}px, 0); transition: {isGhostActive || performingDrop ? 'none' : 'transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)'}"
		onpointerdown={handler.handlePointerDown}
		onpointermove={handler.handlePointerMove}
		onpointerup={handler.handlePointerUp}
		onpointercancel={handler.handlePointerCancel}
		onclick={handler.handleClick}
		onkeydown={handler.handleKeyDown}
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
