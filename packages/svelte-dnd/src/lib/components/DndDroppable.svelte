<script lang="ts">
	import { getContext, setContext } from 'svelte'
	import type { DndDirection, DndMode } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { CollisionAlgorithm } from '../core/collision/collision-algorithm.js'
	import type { Snippet } from 'svelte'
	import { Droppable } from '../core/entities/droppable.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		/** Unique container identifier. */
		id: string
		/** Arbitrary data attached to the container, surfaced on drop events. */
		data?: Record<string, unknown>
		/** When `true`, drops are not allowed. */
		disabled?: boolean
		/** Layout direction used for drop-zone calculations. Defaults to `'vertical'`. */
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
		/**
		 * Gap between draggable items in pixels.
		 * Applied as margin between adjacent `[data-dnd-slot]` elements (not after the last one).
		 * Useful as a drop-in for `space-y-*` / `space-x-*` without requiring Tailwind.
		 */
		spacing?: number
		children: Snippet
		/** CSS class forwarded to the root element. */
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
		spacing = undefined,
		children,
		class: className
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')
	if (!dndController) {
		throw new Error('[svelte-dnd] <DndDroppable> must be rendered inside a <DndProvider>.')
	}

	if (dndController.debug) setContext('dnd-position-registry', new Map<number, string>())

	const droppable = new Droppable(
		{
			id,
			data,
			disabled,
			direction,
			mode,
			collision,
			accepts,
			strategy: dndController.getStrategyForMode(mode)
		},
		dndController
	)
	setContext('dnd-droppable', droppable)

	$effect(() => { droppable.data = data })
	$effect(() => { droppable.disabled = disabled })
	$effect(() => { droppable.direction = direction })
	$effect(() => { droppable.collision = collision })
	$effect(() => { droppable.accepts = accepts })
	$effect(() => {
		droppable.mode = mode
		droppable.strategy = dndController.getStrategyForMode(mode)
	})
	$effect(() => { droppable.spacing = spacing })

	// Extra margin added during cross-container drag so the container grows in layout flow,
	// preventing translated items from overflowing into siblings below/right.
	const crossContainerSpacer = $derived.by(() => {
		const info = dndController?.dropTargetPadding
		if (!info || info.containerId !== id) return { x: 0, y: 0 }
		return { x: info.x, y: info.y }
	})

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

	// When the tail preview is active, the last slot already shows its spacing margin.
	// Subtract that margin from the spacer to avoid double-spacing.
	const spacerHeight = $derived.by(() => {
		if (crossContainerSpacer.y === 0) return 0
		const tailActive = tailPosition >= 0 && dndController?.dropPreview?.position === tailPosition
		return Math.max(0, crossContainerSpacer.y - (tailActive ? (spacing ?? 0) : 0))
	})
</script>

<div
	class="dnd-droppable {className ?? ''}"
	class:dnd-droppable--disabled={disabled}
	aria-dropeffect={disabled ? 'none' : 'move'}
	data-dnd-droppable
	data-dnd-drop-id={id}
	{@attach dndController?.attachDroppable(droppable)}
>
	{@render children?.()}
	{#if mode === 'sortable'}
		<div style="position: relative">
			<DndPreview {droppable} position={tailPosition >= 0 ? tailPosition : lastValidTailPosition} />
		</div>
	{/if}
	<!-- Spacer that grows the container (including background) during cross-container drag,
	     so translated items don't visually overflow outside the container's bounds. -->
	<div
		aria-hidden="true"
		style="height: {spacerHeight}px; width: {crossContainerSpacer.x > 0 ? crossContainerSpacer.x + 'px' : '0'}; flex-shrink: 0; transition: {dndController?.dragging ? 'height 200ms ease, width 200ms ease' : 'none'}"
	></div>
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
