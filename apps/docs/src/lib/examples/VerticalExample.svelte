<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd';

	let items = $state(
		Array.from({ length: 50 }, (_, i) => ({
			id: String(i + 1),
			label: `Item ${i + 1}`,
			height: Math.floor(Math.random() * (100 - 50 + 1)) + 50
		}))
	);

	const controller = new DndController();

	controller.onDrop((sourceId: string, _sourceData, _targetContainerId: string, position: number) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;

		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});
</script>

<DndProvider {controller}>
	<DndDroppable class="flex space-y-4 flex-col h-[calc(100vh-550px)] min-h-125 overflow-y-auto max-w-xl p-4 bg-foreground border-2 border-second rounded-xl" id="vertical-list" direction="vertical">
		{#each items as item, index (item.id)}
			<DndDraggable id={item.id} position={index}>
				<div class="drag-item">
					<span class="text-2xl">{item.id}</span>
				</div>
			</DndDraggable>
		{/each}
	</DndDroppable>
</DndProvider>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
