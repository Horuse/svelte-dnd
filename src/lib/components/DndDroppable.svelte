<script lang="ts">
	import { getContext, onDestroy, setContext } from 'svelte'
	import type { DndDirection } from '../types.js'
	import type { DndController } from '../core/dnd/dnd-controller.svelte.js'
	import type { Snippet } from 'svelte'
	import { DropHandler } from '../core/handlers/drop-handler.svelte.js'

	interface Props {
		id: string
		data?: Record<string, any>
		disabled?: boolean
		direction?: DndDirection
		children: Snippet
		class?: string
	}

	let {
		id,
		data = {},
		disabled = false,
		direction = 'vertical',
		children,
		class: className
	}: Props = $props()

	const dndController = getContext<DndController>('dnd')
	setContext('dnd-container-id', () => id)
	let element: HTMLElement

	$effect(() => {
		if (dndController) dndController.registerDroppableData(id, data)
	})

	const handler = new DropHandler(
		() => element,
		() => ({ id, data, disabled, direction, dndController })
	)

	onDestroy(() => handler.destroy())
</script>

<div
	bind:this={element}
	class="dnd-droppable {className ?? ''}"
	class:dnd-droppable--disabled={disabled}
	data-dnd-drop-id={id}
	data-dnd-direction={direction}
	data-dnd-scroll
>
	{@render children()}
</div>

<style>
	.dnd-droppable {
		min-height: var(--dnd-droppable-min-height, 20px);
	}

	.dnd-droppable--disabled {
		opacity: 0.5;
		pointer-events: none;
	}
</style>
