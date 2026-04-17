<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, overlap } from '@horuse/svelte-dnd'

	type Item = { id: string; label: string }

	let left = $state<Item[]>([
		{ id: 'a', label: 'Alpha' },
		{ id: 'b', label: 'Beta' },
		{ id: 'c', label: 'Gamma' },
	])
	let right = $state<Item[]>([
		{ id: 'd', label: 'Delta' },
		{ id: 'e', label: 'Epsilon' },
	])

	const controller = new DndController()

	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		const isLeft = left.some((i) => i.id === sourceId)
		const srcList = isLeft ? left : right
		const setSrc = isLeft
			? (v: Item[]) => { left = v }
			: (v: Item[]) => { right = v }
		const setDst = targetContainerId === 'left'
			? (v: Item[]) => { left = v }
			: (v: Item[]) => { right = v }
		const dstList = targetContainerId === 'left' ? left : right

		const item = srcList.find((i) => i.id === sourceId)!
		setSrc(srcList.filter((i) => i.id !== sourceId))
		const updated = [...dstList.filter((i) => i.id !== sourceId)]
		updated.splice(position, 0, item)
		setDst(updated)
	})
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-neutral-500">Right column requires 40% overlap — drag slowly across the border to feel the difference.</p>

	<DndProvider {controller}>
		<div class="flex h-72 gap-4">
			<div class="flex flex-col w-56 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
				<h2 class="text-base p-4 font-semibold text-neutral-500">centerPoint <span class="text-xs opacity-60">default</span></h2>
				<DndDroppable id="left" spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3">
					{#each left as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item">{item.label}</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>

			<div class="flex flex-col w-56 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
				<h2 class="text-base p-4 font-semibold text-neutral-500">overlap 40%</h2>
				<DndDroppable id="right" spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3" collision={overlap('40%')}>
					{#each right as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item">{item.label}</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>
		</div>
	</DndProvider>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
