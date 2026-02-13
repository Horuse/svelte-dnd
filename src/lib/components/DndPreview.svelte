<script lang="ts">
	import { getContext } from 'svelte'
	import type { DragController } from '../core/drag-controller.svelte.js'
	import type { DndDirection } from '../types.js'
	import { createConditionalSlide, createConditionalScale } from '../utils/conditional-transition.js'

	interface Props {
		containerId: string
		position: number
		show?: boolean
		direction?: DndDirection
		fallbackHeight?: number
		fallbackWidth?: number
		class?: string
	}

	let {
		containerId,
		position,
		show = true,
		direction = 'vertical',
		fallbackHeight = 48,
		fallbackWidth = 48,
		class: className = ''
	}: Props = $props()

	const axis = direction === 'horizontal' ? 'x' : 'y'

	const dndManager = getContext<DragController>('dnd')
	const conditionalSlide = createConditionalSlide(dndManager)
	const conditionalScale = createConditionalScale(dndManager)

	const visible = $derived(
		show &&
			!!dndManager?.dropPreview &&
			dndManager.dropPreview.containerId === containerId &&
			dndManager.dropPreview.position === position &&
			dndManager.dropPreview.visible
	)

	const height = $derived(dndManager?.dropPreview?.draggedElementHeight || fallbackHeight)
	const width = $derived(dndManager?.dropPreview?.draggedElementWidth || fallbackWidth)

	let previewHeight = $state(0)
</script>

{#if visible}
	<div
		bind:offsetHeight={previewHeight}
		data-dnd-preview
		transition:conditionalSlide|global={{ duration: 400, axis }}
		style="height: {height}px; width: {width}px"
		class="dnd-preview {className}"
	>
		{#if previewHeight > height * 0.85}
			<div
				transition:conditionalScale|global={{ duration: 400 }}
				class="dnd-preview__inner"
			></div>
		{/if}
	</div>
{/if}

<style>
	.dnd-preview {
		flex-shrink: 0;
		transition:
			height var(--dnd-preview-transition-duration, 200ms) ease,
			width var(--dnd-preview-transition-duration, 200ms) ease;
	}

	.dnd-preview__inner {
		background: var(--dnd-preview-bg, rgba(0, 0, 0, 0.05));
		border: var(--dnd-preview-border, 2px dashed rgba(0, 0, 0, 0.2));
		border-radius: var(--dnd-preview-border-radius, 8px);
		height: 100%;
	}
</style>