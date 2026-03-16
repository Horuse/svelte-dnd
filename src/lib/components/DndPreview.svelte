<script lang="ts">
	import { getContext } from 'svelte'
	import type { DragController } from '../core/drag-controller.svelte'

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

	const height = $derived(dndManager?.dropPreview?.draggedElementHeight)
	const width = $derived(dndManager?.dropPreview?.draggedElementWidth)
</script>

<div
		data-dnd-preview
		data-dnd-preview-position={position}
		class="dnd-preview {className}"
		class:dnd-preview--visible={visible}
		style:height={visible ? `${height}px` : '0px'}
		style:width={visible ? `${width}px` : '0px'}
>

</div>

<style>
	.dnd-preview {
		position: absolute;
		pointer-events: none;
	}

	.dnd-preview--visible {
		transform: scale(0.8);
		border-radius: var(--dnd-preview-border-radius, 8px);
		background: var(--dnd-preview-bg, rgba(99, 102, 241, 0.15));
		border: var(--dnd-preview-border, 2px dashed rgba(99, 102, 241, 0.4));
		animation: var(--dnd-preview-animation-in, dnd-preview-in 300ms cubic-bezier(0.33, 0.49, 0.27, 0.67) forwards);
	}

	.dnd-preview:not(.dnd-preview--visible) {
		animation: var(--dnd-preview-animation-out, dnd-preview-out 300ms cubic-bezier(0.33, 0.49, 0.27, 0.67) forwards);
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
