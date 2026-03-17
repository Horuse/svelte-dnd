<script lang="ts">
	import { getContext, untrack } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte'

	interface Props {
		containerId: string
		position: number
		class?: string
	}

	let {
		containerId,
		position,
		class: className = ''
	}: Props = $props()

	const dndManager = getContext<DndController>('dnd')

	const visible = $derived(
			!!dndManager?.dropPreview &&
			dndManager.dropPreview.containerId === containerId &&
			dndManager.dropPreview.position === position &&
			dndManager.dropPreview.visible
	)

	let height = $state(0)
	let width = $state(0)
	let revealed = $state(false)
	let instant = $state(false)

	let showTimer: ReturnType<typeof setTimeout> | null = null
	let collapseTimer: ReturnType<typeof setTimeout> | null = null

	$effect(() => {
		if (visible) {
			height = dndManager?.dropPreview?.draggedElementHeight ?? 0
			width = dndManager?.dropPreview?.draggedElementWidth ?? 0

			// Cancel any pending collapse from previous hide
			if (collapseTimer) { clearTimeout(collapseTimer); collapseTimer = null }

			const skip = untrack(() => dndManager?.skipDropPreviewAnimation)
			if (skip) {
				// Appear instantly with no transition — feels like the slot was always there
				if (showTimer) { clearTimeout(showTimer); showTimer = null }
				revealed = true
				instant = true
				requestAnimationFrame(() => { instant = false })
			} else if (!showTimer) {
				// Delay reveal so the slot has time to open before the preview fades in
				showTimer = setTimeout(() => {
					revealed = true
					showTimer = null
				}, 300)
			}
		} else {
			if (showTimer) { clearTimeout(showTimer); showTimer = null }
			revealed = false
			instant = false

			// Collapse size after fade-out transition completes
			collapseTimer = setTimeout(() => {
				height = 0
				width = 0
				collapseTimer = null
			}, 200)
		}
	})
</script>

<div
	data-dnd-preview
	data-dnd-preview-position={position}
	class="dnd-preview {className}"
	class:dnd-preview--revealed={revealed}
	class:dnd-preview--instant={instant}
	style:height={`${height}px`}
	style:width={`${width}px`}
	style:visibility={height === 0 ? 'hidden' : undefined}
>
</div>

<style>
	.dnd-preview {
		position: absolute;
		pointer-events: none;
		opacity: 0;
		transform: scale(0.5);
		transition:
			opacity var(--dnd-preview-duration-out, 200ms) ease,
			transform var(--dnd-preview-duration-out, 200ms) ease;

		border-radius: var(--dnd-preview-border-radius, 1rem);
		background: var(--dnd-preview-bg, rgba(99, 102, 241, 0.15));
		border: var(--dnd-preview-border, 2px dashed rgba(99, 102, 241, 0.4));
	}

	.dnd-preview--revealed {
		opacity: 1;
		transform: scale(1);
		transition:
			opacity var(--dnd-preview-duration-in, 200ms) ease,
			transform var(--dnd-preview-duration-in, 200ms) ease;
	}

	.dnd-preview--instant {
		transition: none;
	}
</style>
