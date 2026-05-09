<script lang="ts">
	import { getContext, setContext, untrack } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { ContainerStrategy } from '../core/containers/strategies/container-strategy.js'
	import type { CollisionAlgorithm } from '../core/collision/collision-algorithm.js'
	import type { Snippet } from 'svelte'
	import { Droppable } from '../core/entities/droppable.svelte.js'
	import DndPreview from './DndPreview.svelte'

	interface Props {
		/** Unique container identifier. */
		id: string
		/**
		 * Container strategy — defines mode, layout, and drop-zone geometry.
		 * Use the `sortable()` or `target()` factory functions.
		 *
		 * @example
		 * ```svelte
		 * <DndDroppable strategy={sortable({ layout: 'grid', flow: 'row' })} />
		 * <DndDroppable strategy={target()} />
		 * ```
		 */
		strategy: ContainerStrategy
		/** Arbitrary data attached to the container, surfaced on drop events. */
		data?: Record<string, unknown>
		/** When `true`, drops are not allowed. */
		disabled?: boolean
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
		strategy,
		data = {},
		disabled = false,
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

	// Initial values only — per-prop $effects below keep the entity reactive.
	const droppable = new Droppable(
		untrack(() => ({
			id,
			data,
			disabled,
			collision,
			accepts,
			strategy
		})),
		dndController
	)
	setContext('dnd-droppable', droppable)

	$effect(() => {
		droppable.data = data
	})
	$effect(() => {
		droppable.disabled = disabled
	})
	$effect(() => {
		droppable.collision = collision
	})
	$effect(() => {
		droppable.accepts = accepts
	})
	$effect(() => {
		droppable.strategy = strategy
	})
	$effect(() => {
		droppable.spacing = spacing
	})

	// Extra margin added during cross-container drag so the container grows in layout flow,
	// preventing translated items from overflowing into siblings below/right.
	const crossContainerSpacer = $derived.by(() => {
		const info = dndController?.dropTargetPadding
		if (!info || info.containerId !== id) return { x: 0, y: 0 }
		return { x: info.x, y: info.y }
	})

	// Tail preview: handles position = itemCount (drop after last item in cross-container drags).
	// Returns -1 (inactive) unless this container is the current drop target.
	const tailPosition = $derived.by(() => {
		if (!dndController?.dropPreview || dndController.dropPreview.containerId !== id) return -1
		return droppable.itemCount
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
		const tailActive =
			tailPosition >= 0 && dndController?.dropPreview?.position === tailPosition
		return Math.max(0, crossContainerSpacer.y - (tailActive ? (spacing ?? 0) : 0))
	})

	const isSortable = $derived(strategy.mode === 'sortable')
	const shift = $derived(
		dndController?.animation.siblingShift ?? {
			duration: 200,
			easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
		}
	)
</script>

<div
	class="dnd-droppable {className ?? ''}"
	class:dnd-droppable--disabled={disabled}
	aria-dropeffect={disabled ? 'none' : 'move'}
	data-dnd-droppable
	data-dnd-drop-id={id}
	data-dnd-layout={strategy.mode === 'sortable' ? (strategy.layout ?? 'vertical') : undefined}
	{@attach dndController?.attachDroppable(droppable)}
>
	{@render children?.()}
	{#if isSortable}
		<div style="position: relative">
			<DndPreview
				{droppable}
				position={tailPosition >= 0 ? tailPosition : lastValidTailPosition}
			/>
		</div>
	{/if}
	<!-- Spacer that grows the container (including background) during cross-container drag,
	     so translated items don't visually overflow outside the container's bounds. -->
	<div
		aria-hidden="true"
		style="height: {spacerHeight}px; width: {crossContainerSpacer.x > 0
			? crossContainerSpacer.x + 'px'
			: '0'}; flex-shrink: 0; transition: {dndController?.dragging
			? `height ${shift.duration}ms ${shift.easing}, width ${shift.duration}ms ${shift.easing}`
			: 'none'}"
	></div>
</div>

<style>
	.dnd-droppable {
		min-height: var(--dnd-droppable-min-height, 20px);
	}

	/* Default flex direction for axis-based sortables. Wrapped in :where() so
	   any consumer class (e.g. Tailwind .grid or .flex-col) wins without
	   needing !important. Grid sortables don't get a default — grid templates
	   are too use-case specific. Target containers carry no data-dnd-layout. */
	:where(.dnd-droppable[data-dnd-layout='vertical']) {
		display: flex;
		flex-direction: column;
	}
	:where(.dnd-droppable[data-dnd-layout='horizontal']) {
		display: flex;
		flex-direction: row;
	}

	.dnd-droppable--disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
