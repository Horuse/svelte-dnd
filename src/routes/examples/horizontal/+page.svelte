<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '$lib/index.js';
	import Description from './description.md';

	let items = $state(
			Array.from({ length: 50 }, (_, i) => ({
				id: String(i + 1),
				label: `Item ${i + 1}`
			}))
	);

	const controller = new DndController();

	controller.onDrop((sourceId: string, _sourceData: any, _targetContainerId: string, position: number) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;

		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});
</script>

<div class="mx-auto max-w-5xl mb-32 gap-6 flex flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		<DndDroppable id="horizontal-list" direction="horizontal" class="flex space-x-2 overflow-x-auto  p-4 bg-foreground border-2 border-second rounded-xl">
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item w-32">
						<span class="text-2xl">{item.id}</span>
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
