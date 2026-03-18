<script lang="ts">
	import { getContext, onDestroy } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte'
	import { PreviewHandler } from '../core/handlers/preview-handler.svelte.js'

	interface Props {
		containerId: string
		position: number
		class?: string
	}

	let { containerId, position, class: className = '' }: Props = $props()

	const dndManager = getContext<DndController>('dnd')
	const handler = new PreviewHandler()

	const visible = $derived(
		!!dndManager?.dropPreview &&
		dndManager.dropPreview.containerId === containerId &&
		dndManager.dropPreview.position === position &&
		dndManager.dropPreview.visible
	)

	$effect(() => {
		if (visible) handler.show(dndManager)
		else handler.hide(dndManager?.performingDrop ?? false)
	})

	onDestroy(() => handler.destroy())
</script>

<div
	data-dnd-preview
	data-dnd-preview-position={position}
	class="dnd-preview {className}"
	class:dnd-preview--revealed={handler.revealed}
	class:dnd-preview--instant={handler.instant}
	style:height={`${handler.height}px`}
	style:width={`${handler.width}px`}
	style:visibility={handler.height === 0 ? 'hidden' : undefined}
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
