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

	const shouldSpeedUp = $derived(
		!!(dndManager?.performingDrop || dndManager?.animatingReturn)
	)

	function speedUpOnDrop(node: HTMLElement, speedUp: boolean) {
		let frameId: number | null = null
		const RATE = 5

		function apply() {
			const anims = node.getAnimations({ subtree: true })
			for (const a of anims) {
				if (a.playbackRate !== RATE) a.playbackRate = RATE
			}
			if (anims.length > 0) {
				frameId = requestAnimationFrame(apply)
			} else {
				frameId = null
			}
		}

		function stop() {
			if (frameId !== null) {
				cancelAnimationFrame(frameId)
				frameId = null
			}
		}

		if (speedUp) apply()

		return {
			update(v: boolean) {
				if (v) apply()
				else stop()
			},
			destroy() {
				stop()
			}
		}
	}
</script>

{#if visible}
	<div use:speedUpOnDrop={shouldSpeedUp}
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