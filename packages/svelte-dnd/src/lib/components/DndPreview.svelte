<script lang="ts">
	import { getContext, onDestroy } from 'svelte'
	import type { DndController } from '../core/dnd/dnd-controller.svelte'
	import { PreviewHandler, type PreviewConfig } from '../core/handlers/preview-handler.svelte.js'
	import type { Slot } from '../core/entities/slot.js'
	import type { Droppable } from '../core/entities/droppable.svelte.js'

	interface Props {
		/** New: pass a Slot entity — direction is read from slot.droppable, no DOMHelper needed. */
		slot?: Slot
		/** Tail preview: pass the Droppable entity directly. */
		droppable?: Droppable
		/** Legacy: explicit container id (used when neither slot nor droppable is available). */
		containerId?: string
		/** Explicit position (used by tail preview and legacy path). */
		position?: number
		class?: string
		previewConfig?: PreviewConfig
		translateX?: number
		translateY?: number
	}

	let { slot, droppable, containerId, position, class: className = '', previewConfig, translateX = 0, translateY = 0 }: Props = $props()

	// Resolve container id and position from slot or droppable when available
	const resolvedContainerId = $derived(slot?.droppable.id ?? droppable?.id ?? containerId ?? '')
	const resolvedPosition = $derived(slot?.position ?? position ?? -1)

	const dndManager = getContext<DndController>('dnd')
	const handler = new PreviewHandler()

	$effect(() => {
		handler.showDelay = previewConfig?.showDelay ?? 300
		handler.collapseDelay = previewConfig?.collapseDelay ?? 200
	})

	const visible = $derived(
		!!dndManager?.dropPreview &&
		dndManager.dropPreview.containerId === resolvedContainerId &&
		dndManager.dropPreview.position === resolvedPosition &&
		dndManager.dropPreview.visible
	)

	let alignSecondary = $state(false)
	let horizontal = $state(false)

	$effect(() => {
		if (visible) {
			// Resolve direction from entity (slot or droppable), no DOM query needed
			horizontal = slot?.droppable.isHorizontal ?? droppable?.isHorizontal ?? false
			alignSecondary = horizontal ? translateX < 0 : translateY < 0
			handler.show(dndManager)
		} else {
			handler.hide(dndManager?.performingDrop ?? false)
		}
	})

	onDestroy(() => handler.destroy())
</script>

<div
	data-dnd-preview
	data-dnd-preview-position={resolvedPosition}
	class="dnd-preview {className}"
	class:dnd-preview--revealed={handler.revealed}
	class:dnd-preview--instant={handler.instant}
	class:dnd-preview--align-bottom={alignSecondary && !horizontal}
	class:dnd-preview--align-right={alignSecondary && horizontal}
	style:height={`${handler.height}px`}
	style:width={`${handler.width}px`}
	style:visibility={handler.height === 0 ? 'hidden' : undefined}
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
