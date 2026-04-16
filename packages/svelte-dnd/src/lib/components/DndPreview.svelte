<script lang="ts">
	import { getContext } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import { Preview, type PreviewConfig } from '../core/entities/preview.svelte.js'
	import type { Slot } from '../core/entities/slot.js'
	import type { Droppable } from '../core/entities/droppable.svelte.js'

	interface Props {
		/** Pass a Slot entity — container and direction are resolved from slot.droppable. */
		slot?: Slot
		/** Tail preview: pass the Droppable entity directly. */
		droppable?: Droppable
		/** Position within the droppable (required). */
		position: number
		class?: string
		previewConfig?: PreviewConfig
	}

	let { slot, droppable, position, class: className = '', previewConfig }: Props = $props()

	const dndController = getContext<DndController>('dnd')
	const preview = new Preview(dndController, { slot, droppable, position, config: previewConfig })

	$effect(() => {
		preview.slot = slot
		preview.droppable = droppable
		preview.position = position
		preview.showDelay = previewConfig?.showDelay ?? 300
		preview.collapseDelay = previewConfig?.collapseDelay ?? 200
	})

	$effect(() => {
		if (preview.isVisible) {
			preview.show()
		} else {
			preview.hide(dndController?.performingDrop ?? false)
		}
	})
</script>

<div
	data-dnd-preview
	data-dnd-preview-position={position}
	class="dnd-preview {className}"
	class:dnd-preview--revealed={preview.revealed}
	class:dnd-preview--instant={preview.instant}
	class:dnd-preview--align-bottom={preview.align === 'end' && !preview.isHorizontal}
	class:dnd-preview--align-right={preview.align === 'end' && preview.isHorizontal}
	style:height={`${preview.height}px`}
	style:width={`${preview.width}px`}
	style:visibility={preview.height === 0 ? 'hidden' : undefined}
	{@attach preview.attach()}
>
</div>

<style>
	.dnd-preview {
		position: absolute;
		top: 0;
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

	.dnd-preview--align-bottom {
		top: auto;
		bottom: 0;
	}

	.dnd-preview--align-right {
		left: auto;
		right: 0;
	}
</style>
