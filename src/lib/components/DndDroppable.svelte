<script lang="ts">
	import { getContext, onDestroy, setContext } from 'svelte'
	import type { DndDirection } from '../types.js'
	import type { DragController } from '../core/drag-controller.svelte.js'
	import type { Snippet } from 'svelte'

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

	const dndController = getContext<DragController>('dnd')
	setContext('dnd-container-id', () => id)
	let element: HTMLElement

	$effect(() => {
		if (dndController) {
			dndController.registerDroppableData(id, data)
		}
	})

	let scrollListeners: HTMLElement[] = []
	let scrollTimeout: ReturnType<typeof setTimeout> | null = null

	const handleScroll = () => {
		if (dndController?.dragging) {
			if (scrollTimeout) {
				clearTimeout(scrollTimeout)
			}
			scrollTimeout = setTimeout(() => {
				updateDropZones()
				scrollTimeout = null
			}, 10)
		}
	}

	const updateDropZones = () => {
		if (!element || disabled || !dndController) return
		if (dndController.element?.contains(element)) return

		const zones = dndController.calculateDropZones(id, element, direction)
		const existingZones = dndController.dropZones || []
		const mergedZones = dndController.mergeDropZones(existingZones, zones, id)
		dndController.registerDropZones(mergedZones)
	}

	const setupScrollListeners = () => {
		let parent = element?.parentElement
		while (parent) {
			const style = window.getComputedStyle(parent)
			const overflowY = style.overflowY
			const overflowX = style.overflowX
			if (
				['auto', 'scroll', 'overlay'].includes(overflowY) ||
				['auto', 'scroll', 'overlay'].includes(overflowX)
			) {
				parent.addEventListener('scroll', handleScroll, { passive: true })
				scrollListeners.push(parent)
			}
			parent = parent.parentElement
		}

		if (typeof window !== 'undefined') {
			window.addEventListener('scroll', handleScroll, { passive: true })
		}
	}

	const cleanupScrollListeners = () => {
		scrollListeners.forEach((parent) => {
			parent.removeEventListener('scroll', handleScroll)
		})
		if (typeof window !== 'undefined') {
			window.removeEventListener('scroll', handleScroll)
		}
		scrollListeners = []
		if (scrollTimeout) {
			clearTimeout(scrollTimeout)
			scrollTimeout = null
		}
	}

	const unsubscribeDragStart = dndController?.onDragStart(() => {
		updateDropZones()
		setupScrollListeners()
	})

	const unsubscribeZonesInvalidated = dndController?.onZonesInvalidated(() => {
		updateDropZones()
	})

	const unsubscribeDragEnd = dndController?.onDragEnd(() => {
		cleanupScrollListeners()
	})

	onDestroy(() => {
		cleanupScrollListeners()
		unsubscribeDragStart?.()
		unsubscribeZonesInvalidated?.()
		unsubscribeDragEnd?.()
		dndController?.unregisterDroppableData(id)
	})
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
