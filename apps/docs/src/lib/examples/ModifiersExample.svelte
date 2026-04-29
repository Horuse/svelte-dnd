<script lang="ts">
	import {
		DndProvider, DndDroppable, DndDraggable, DndController, sortable,
		restrictToVerticalAxis, restrictToHorizontalAxis, snapToGrid, restrictToContainer,
		type Modifier,
	} from '@horuse/svelte-dnd'

	type Option = { label: string; value: Modifier[] }

	const options: Option[] = [
		{ label: 'None', value: [] },
		{ label: 'Vertical axis', value: [restrictToVerticalAxis] },
		{ label: 'Horizontal axis', value: [restrictToHorizontalAxis] },
		{ label: 'Restrict to container', value: [restrictToContainer] },
		{ label: 'Snap 40px', value: [snapToGrid({ x: 40, y: 40 })] },
		{ label: 'Restrict + Snap', value: [restrictToContainer, snapToGrid({ x: 40, y: 40 })] },
	]

	let activeIndex = $state(1)

	let items = $state(
		Array.from({ length: 6 }, (_, i) => ({ id: String(i), label: `Item ${i + 1}` }))
	)

	const controller = new DndController({ modifiers: options[activeIndex].value })
	controller.onDrop(({ item: { id: sourceId }, target: { position } }) => {
		const from = items.findIndex((i) => i.id === sourceId)
		if (from === -1) return
		const updated = [...items]
		const [moved] = updated.splice(from, 1)
		updated.splice(position, 0, moved)
		items = updated
	})

	$effect(() => {
		controller.setModifiers(options[activeIndex].value)
	})
</script>

<div class="flex flex-col gap-4 max-w-sm">
	<div class="flex flex-wrap gap-2">
		{#each options as opt, i}
			<button
				class="black-button p-2 px-4"
				class:active={activeIndex === i}
				onclick={() => (activeIndex = i)}
			>
				{opt.label}
			</button>
		{/each}
	</div>

	<DndProvider {controller}>
		<DndDroppable
			spacing={12} class="flex flex-col max-w-sm p-3 bg-foreground border-2 border-second rounded-xl"
			id="list"
			strategy={sortable()}
		>
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item">
						<span class="text-lg">{item.label}</span>
					</div>
				</DndDraggable>
			{/each}
		</DndDroppable>
	</DndProvider>
</div>

<style>

	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
