<script lang="ts">
	import { getContext, onDestroy, onMount } from 'svelte'
	import { fly } from 'svelte/transition'
	import { backOut } from 'svelte/easing'
	import type { DndController } from '@horuse/svelte-dnd';
	import { DndDroppable, target } from '@horuse/svelte-dnd';

	interface TrashTask {
		id: string
		label: string
		columnId: string
		position: number
	}

	interface TrashItem {
		task: TrashTask
		progress: number
		rafId: number | null
	}

	interface Props {
		onRemove: (taskId: string, columnId: string) => TrashTask | null
		onRestore: (task: TrashTask) => void
	}

	let { onRemove, onRestore }: Props = $props()

	const controller = getContext<DndController>('dnd')

	const isDragging = $derived((controller?.dragging ?? false) && controller?.dragSource === 'user')
	const isHovering = $derived(controller?.dropPreview?.containerId === 'trash-zone')

	const DELETE_DELAY = 5000

	let items = $state<TrashItem[]>([])

	const unsubscribe = controller?.onDrop(({ item: dropped, target }) => {
		if (target.id !== 'trash-zone') return
		if (!dropped.data?.columnId) return

		const task = onRemove(dropped.id, dropped.data.columnId as string)
		if (!task) return

		const item: TrashItem = { task, progress: 100, rafId: null }
		items.push(item)

		const startTime = Date.now()
		const tick = () => {
			const elapsed = Date.now() - startTime
			const progress = Math.max(0, 100 - (elapsed / DELETE_DELAY) * 100)
			const idx = items.findIndex(i => i.task.id === task.id)
			if (idx === -1) return

			items[idx].progress = progress

			if (progress > 0) {
				items[idx].rafId = requestAnimationFrame(tick)
			} else {
				items.splice(idx, 1)
			}
		}

		item.rafId = requestAnimationFrame(tick)
	})

	async function cancelDelete(item: TrashItem) {
		if (item.rafId !== null) cancelAnimationFrame(item.rafId)
		const idx = items.findIndex(i => i.task.id === item.task.id)
		if (idx === -1) return

		try {
			await controller.animateItem(item.task.id, {
				to: { containerId: item.task.columnId, position: item.task.position },
				style: 'return'
			})
		} catch {
			// element not found or drag in progress — restore without animation
		}

		onRestore(item.task)
		const currentIdx = items.findIndex(i => i.task.id === item.task.id)
		if (currentIdx !== -1) items.splice(currentIdx, 1)
	}

	onDestroy(() => {
		unsubscribe?.()
		items.forEach(i => { if (i.rafId !== null) cancelAnimationFrame(i.rafId) })
	})

	// Animated dashed border
	let dashOffset = $state(0)
	let borderRafId: number

	onMount(() => {
		const animate = () => {
			dashOffset = (dashOffset + 0.3) % 15
			borderRafId = requestAnimationFrame(animate)
		}
		borderRafId = requestAnimationFrame(animate)
		return () => cancelAnimationFrame(borderRafId)
	})
</script>

<!-- Undo panel -->
{#if items.length > 0}
	<div
		transition:fly={{ y: 20, duration: 300, easing: backOut }}
		class="absolute p-3 shadow-2xl right-5 bg-foreground  rounded-2xl overflow-hidden bottom-5 z-[60] flex flex-col gap-3 w-80"
	>
		<svg class="absolute stroke-second-active inset-0 pointer-events-none" width="100%" height="100%">
			<rect
				width="100%"
				height="100%"
				fill="none"
				stroke-width="4"
				stroke-dasharray="10 5"
				stroke-dashoffset={dashOffset}
				rx="16"
				ry="16"
			/>
		</svg>

		{#each items as item (item.task.id)}
			<div class="flex items-center gap-3 bg-primary rounded-xl p-3 overflow-hidden relative">
				<!-- progress bar -->
				<div
					class="absolute inset-0 bg-red-500/10 pointer-events-none"
					style="width: {item.progress}%"
				></div>
				<span class="truncate text-sm flex-1 text-neutral-500 relative z-10">{item.task.label}</span>
				<button
					class="black-button text-xs px-3 py-1 shrink-0 relative z-10"
					onclick={() => cancelDelete(item)}
				>
					Undo
				</button>
			</div>
		{/each}

		<p class="text-xs text-neutral-500 px-1">Items will be permanently deleted when the bar empties.</p>
	</div>
{/if}

<!-- Drop target -->
<DndDroppable
	id="trash-zone"
	strategy={target()}
	accepts="task"
	class="absolute bottom-5 w-20 h-20 rounded-full backdrop-blur-sm flex items-center justify-center z-[1000] transition-all duration-300 ease-out right-5 {!isDragging ? 'opacity-0 scale-75 pointer-events-none' : 'opacity-100 scale-100'} {isHovering ? 'bg-red-500/90 scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)]' : 'bg-neutral-400/70'}"
>
	<!-- Hidden ghost anchors for simulateReturn -->
	{#each items as item (item.task.id)}
		<div
			data-dnd-draggable-item
			data-dnd-drag-id={item.task.id}
			style="position:absolute;opacity:0;pointer-events:none;width:260px"
		>
			<div class="drag-item px-4 gap-3">
				<span class="truncate">{item.task.label}</span>
				<button data-dnd-no-drag class="black-button">Alert</button>
			</div>
		</div>
	{/each}

	<div class="text-white transition-transform duration-200 {isHovering ? 'scale-110' : ''}">
		<svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
			<path
				d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>
		</svg>
	</div>
</DndDroppable>

