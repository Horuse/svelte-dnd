<script lang="ts">
	import { setContext, onDestroy, untrack } from 'svelte'
	import { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { PreviewConfig } from '../core/handlers/preview-handler.svelte.js'
	import type { ScrollConfig } from '../core/scroll/scroll-controller.js'
	import type { GhostSnippet } from '../types.js'
	import type { Snippet } from 'svelte'

	interface Props {
		children: Snippet
		controller?: DndController
		ghost?: GhostSnippet
		scrollConfig?: ScrollConfig
		previewConfig?: PreviewConfig
	}

	let { children, ghost, ...rest }: Props = $props()

	const dragController = untrack(() => rest.controller) ?? new DndController(untrack(() => rest.scrollConfig), untrack(() => rest.previewConfig))
	const ownsController = untrack(() => !rest.controller)

	let rotated = $state(false)

	/**
	 * Fallback ghost renderer — clones the dragged element's DOM via `cloneNode(true)`.
	 *
	 * Limitations: `cloneNode` copies the static DOM only. The following are NOT preserved:
	 * - Svelte component state and reactivity
	 * - Event listeners
	 * - `<canvas>` content
	 * - `<input>` / `<textarea>` `.value` (only the `value` attribute is cloned, not the live property)
	 *
	 * For anything beyond a static visual copy, use the `ghost` snippet instead.
	 */
	function cloneContent(node: HTMLElement, source: HTMLElement) {
		const doClone = (src: HTMLElement) => {
			node.replaceChildren(...Array.from(src.childNodes).map(n => n.cloneNode(true)))
		}
		doClone(source)
		return {
			update: doClone,
			destroy() {}
		}
	}

	$effect(() => {
		if (dragController.dragging) {
			rotated = false
			requestAnimationFrame(() => {
				rotated = true
			})
		}
	})

	setContext('dnd', dragController)

	let dragCursorStyle: HTMLStyleElement | null = null

	$effect(() => {
		if (dragController.dragging) {
			if (!dragCursorStyle) {
				dragCursorStyle = document.createElement('style')
				dragCursorStyle.textContent = '* { cursor: grabbing !important; }'
				document.head.appendChild(dragCursorStyle)
			}
		} else {
			if (dragCursorStyle) {
				dragCursorStyle.remove()
				dragCursorStyle = null
			}
		}
	})

	onDestroy(() => {
		dragCursorStyle?.remove()
		if (ownsController) dragController.destroy()
	})
</script>

{@render children()}

{#if (dragController.dragging || dragController.animatingReturn) && dragController.element && dragController.transform && dragController.size}
	<div
		class="dnd-ghost"
		data-dnd-dragged-element
		class:dnd-ghost--returning={dragController.animatingReturn}
		style="
			left: {dragController.transform.x}px;
			top: {dragController.transform.y}px;
			width: {dragController.size.width}px;
			height: {dragController.size.height}px;
			transform: rotate({dragController.animatingReturn ? '0deg' : rotated ? 'var(--dnd-ghost-rotation, 3deg)' : '0deg'});
		"
	>
		{#if ghost && dragController.draggedItem}
			{@render ghost({
				element: dragController.element,
				data: dragController.draggedItemData,
				itemId: dragController.draggedItem
			})}
		{:else}
			<div style="display: contents" use:cloneContent={dragController.element}></div>
		{/if}
	</div>
{/if}

{#if dragController.debugZones && dragController.dropZones}
	{#each dragController.dragging ? dragController.filteredDropZones : dragController.dropZones as zone, index}
		<div
			class="dnd-debug-zone"
			class:dnd-debug-zone--first={zone.position === 0}
			style="left: {zone.rect.x}px; top: {zone.rect.y}px; width: {zone.rect.width}px; height: {zone.rect.height}px;"
		>
			<span class="dnd-debug-zone__label">
				{zone.containerId} pos:{zone.position}
			</span>
		</div>
	{/each}
{/if}

<style>
	.dnd-ghost {
		position: fixed;
		pointer-events: none;
		z-index: var(--dnd-ghost-z-index, 9999);
		opacity: var(--dnd-ghost-opacity, 0.8);
		transition: transform var(--dnd-ghost-rotation-duration, 200ms) ease;
		scale: var(--dnd-ghost-scale, 1);
	}

	.dnd-ghost--returning {
		transform: rotate(0deg) !important;
	}

	.dnd-debug-zone {
		position: fixed;
		pointer-events: none;
		z-index: 9998;
		border: 2px dashed;
		opacity: 0.6;
		border-color: blue;
	}

	.dnd-debug-zone--first {
		border-color: red;
	}

	.dnd-debug-zone__label {
		position: absolute;
		top: 0;
		left: 0;
		background: black;
		color: white;
		font-size: 10px;
		padding: 0 4px;
		border-radius: 2px;
	}
</style>
