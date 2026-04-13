<script lang="ts">
	import { getContext, setContext } from 'svelte'
	import type { DndDirection, DndMode } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { CollisionAlgorithm } from '../core/collision/collision-algorithm.js'
	import type { Snippet } from 'svelte'
	import { Droppable } from '../core/entities/droppable.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		id: string
		data?: Record<string, unknown>
		disabled?: boolean
		direction?: DndDirection
		/**
		 * `'sortable'` (default) — position-based drop zones with insert previews.
		 * `'target'` — single drop zone covering the whole container, no previews.
		 *   Use for trash zones, boards, or any droppable that isn't a sorted list.
		 */
		mode?: DndMode
		/**
		 * Collision detection algorithm for this container.
		 * Overrides the global `collision` set on `DndController`.
		 * Defaults to `centerPoint` if neither is set.
		 *
		 * @example
		 * ```svelte
		 * <DndDroppable collision={overlap('25%')} />
		 * ```
		 */
		collision?: CollisionAlgorithm
		/** Item type(s) this container accepts. If omitted, accepts everything. */
		accepts?: string | string[]
		children: Snippet
		class?: string
	}

	let {
		id,
		data = {},
		disabled = false,
		direction = 'vertical',
		mode = 'sortable',
		collision = undefined,
		accepts = undefined,
		children,
		class: className
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')

	// Keep for backward compat (DndDraggable debug position registry)
	setContext('dnd-container-id', () => id)
	if (dndController?.debug) setContext('dnd-position-registry', new Map<number, string>())

	const droppable = new Droppable(
		{
			id,
			data,
			disabled,
			direction,
			mode,
			collision,
			accepts,
			strategy: dndController?.getStrategyForMode(mode)!
		},
		dndController
	)
	setContext('dnd-droppable', droppable)

	// Tail preview: handles position = slots.size (drop after last item in cross-container drags).
	// Returns -1 (inactive) unless this container is the current drop target.
	const tailPosition = $derived.by(() => {
		if (!dndController?.dropPreview?.visible || dndController.dropPreview.containerId !== id) return -1
		return droppable.slots.size
	})

	// Keep the last valid tail position so the preview knows its size while animating out.
	let lastValidTailPosition = $state(0)
	$effect(() => {
		if (tailPosition >= 0) lastValidTailPosition = tailPosition
	})
</script>

<div
	class="dnd-droppable {className ?? ''}"
	class:dnd-droppable--disabled={disabled}
	aria-dropeffect={disabled ? 'none' : 'move'}
	data-dnd-droppable
	data-dnd-drop-id={id}
	data-dnd-direction={direction}
	data-dnd-mode={mode}
	{@attach dndController?.attachDroppable(droppable)}
>
	{@render children()}
	{#if mode === 'sortable'}
		<div style="position: relative">
			<DndPreview containerId={id} position={tailPosition >= 0 ? tailPosition : lastValidTailPosition} />
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
