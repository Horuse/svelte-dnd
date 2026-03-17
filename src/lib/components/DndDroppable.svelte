<script lang="ts">
	import { getContext, onDestroy, setContext } from 'svelte'
	import type { DndDirection, DndMode } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { Snippet } from 'svelte'
	import { DropHandler } from '../core/handlers/drop-handler.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		id: string
		data?: Record<string, any>
		disabled?: boolean
		direction?: DndDirection
		/**
		 * `'sortable'` (default) — position-based drop zones with insert previews.
		 * `'target'` — single drop zone covering the whole container, no previews.
		 *   Use for trash zones, boards, or any droppable that isn't a sorted list.
		 */
		mode?: DndMode
		/**
		 * How much of the dragged element must overlap this container to activate it.
		 * - `number` — pixels of intersection required (0 = any pixel)
		 * - `string` — CSS-like percentage of the ghost's smaller dimension, e.g. `"25%"`
		 * - `undefined` (default) — center-point detection (current behaviour)
		 */
		overlap?: number | string
		children: Snippet
		class?: string
	}

	let {
		id,
		data = {},
		disabled = false,
		direction = 'vertical',
		mode = 'sortable',
		overlap = undefined,
		children,
		class: className
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')
	setContext('dnd-container-id', () => id)
	let element: HTMLElement

	$effect(() => {
		if (dndController) dndController.registerDroppableData(id, data)
	})

	const handler = new DropHandler(
		() => element,
		() => ({ id, data, disabled, direction, mode, dndController })
	)

	onDestroy(() => handler.destroy())

	// Tail preview: handles position = items.length (drop after the last item in cross-container drags).
	// DndDraggable renders previews for positions 0..M-1; position M is never covered by an item wrapper.
	// tailPosition stays -1 (inactive) unless this container is the current drop target.
	const tailPosition = $derived.by(() => {
		if (!dndController?.dropPreview?.visible || dndController.dropPreview.containerId !== id) return -1
		if (!element) return -1
		return element.querySelectorAll('[data-dnd-draggable-item]').length
	})
</script>

<div
	bind:this={element}
	class="dnd-droppable {className ?? ''}"
	class:dnd-droppable--disabled={disabled}
	data-dnd-drop-id={id}
	data-dnd-direction={direction}
	data-dnd-mode={mode}
	data-dnd-overlap={overlap !== undefined ? String(overlap) : undefined}
	data-dnd-scroll
>
	{@render children()}
	{#if tailPosition >= 0 && mode === 'sortable'}
		<div style="position: relative">
			<DndPreview containerId={id} position={tailPosition} />
		</div>
	{/if}
</div>

<style>
	.dnd-droppable {
		min-height: var(--dnd-droppable-min-height, 20px);
	}

	.dnd-droppable--disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
