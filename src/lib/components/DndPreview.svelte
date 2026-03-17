<script lang="ts">
	import { getContext } from 'svelte'
	import type { DragController } from '../core/controller/drag-controller.svelte'

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

	const dndManager = getContext<DragController>('dnd')

	const visible = $derived(
			!!dndManager?.dropPreview &&
			dndManager.dropPreview.containerId === containerId &&
			dndManager.dropPreview.position === position &&
			dndManager.dropPreview.visible
	)

	let cachedHeight = $state(0)
	let cachedWidth = $state(0)

	$effect(() => {
		if (visible) {
			cachedHeight = dndManager?.dropPreview?.draggedElementHeight ?? 0
			cachedWidth = dndManager?.dropPreview?.draggedElementWidth ?? 0
		} else if (!dndManager?.dropPreview) {
			cachedHeight = 0
			cachedWidth = 0
		}
	})
</script>

<div
		data-dnd-preview
		data-dnd-preview-position={position}
		class="dnd-preview {className}"
		class:dnd-preview--visible={visible}
		style:height={`${cachedHeight}px`}
		style:width={`${cachedWidth}px`}
		style:visibility={cachedHeight === 0 ? 'hidden' : undefined}
>

</div>

<style>
	.dnd-preview {
		z-index: 0;
		position: absolute;
		pointer-events: none;

		border-radius: var(--dnd-preview-border-radius, 1rem);
		background: var(--dnd-preview-bg, rgba(99, 102, 241, 0.15));
		border: var(--dnd-preview-border, 2px dashed rgba(99, 102, 241, 0.4));
	}

	.dnd-preview--visible {
		transform: scale(0.8);
		animation: var(--dnd-preview-animation-in, dnd-preview-in 300ms cubic-bezier(0.33, 0.49, 0.27, 0.67) forwards);
	}

	.dnd-preview:not(.dnd-preview--visible) {
		animation: var(--dnd-preview-animation-out, dnd-preview-out 100ms cubic-bezier(0.33, 0.49, 0.27, 0.67) forwards);
	}

	@keyframes dnd-preview-in {
		from {
			opacity: 0;
			transform: scale(0.8);
		}
		to {
			opacity: 1;
			transform: scale(1);
		}
	}

	@keyframes dnd-preview-out {
		from {
			opacity: 1;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(0.8);
		}
	}
</style>
