<script lang="ts">
	import { getContext } from 'svelte'
	import type { DragController } from '../core/drag-controller.svelte.js'
	import type { DndDirection } from '../types.js'

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

	const dndManager = getContext<DragController>('dnd')

	const visible = $derived(
			show &&
			!!dndManager?.dropPreview &&
			dndManager.dropPreview.containerId === containerId &&
			dndManager.dropPreview.position === position &&
			dndManager.dropPreview.visible
	)

	const height = $derived(dndManager?.dropPreview?.draggedElementHeight || fallbackHeight)
	const width = $derived(dndManager?.dropPreview?.draggedElementWidth || fallbackWidth)
</script>

<div
		data-dnd-preview
		data-dnd-preview-position={position}
		class="dnd-preview bg-red-500 {className}"
		class:dnd-preview--visible={visible}
		style:height="{0}px"
		style:width={direction === 'horizontal' ? `${width}px` : undefined}
></div>

<style>
	/*.dnd-preview {*/
	/*	z-index: -1;*/
	/*	position: absolute;*/
	/*	left: 0px;*/
	/*	right: 0px;*/
	/*	top: -2px;*/
	/*	pointer-events: none;*/
	/*	transform: translateY(calc(-100% - 10px));*/
	/*	opacity: 0;*/
	/*	transition: opacity 100ms cubic-bezier(0.25, 0.46, 0.45, 0.94);*/
	/*}*/

	/*.dnd-preview--visible {*/
	/*	opacity: 1;*/
	/*}*/
</style>