<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';

	let items = $state([
		{ id: '1', label: 'Card 1' },
		{ id: '2', label: 'Card 2' },
		{ id: '3', label: 'Card 3' },
		{ id: '4', label: 'Card 4' },
		{ id: '5', label: 'Card 5' }
	]);

	const controller = new DragController();
	const dropPreview = $derived(controller.dropPreview);

	controller.onDrop((sourceId: string, _sourceData: any, _targetContainerId: string, position: number) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;

		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		const targetIndex = position > fromIndex ? position - 1 : position;
		updated.splice(targetIndex, 0, moved);
		items = updated;
	});
</script>

<div>
	<h1 class="text-2xl font-bold mb-2">Horizontal List</h1>
	<p class="text-gray-600 mb-6">Drag items to reorder them horizontally.</p>

	<DndProvider {controller}>
		<DndDroppable id="horizontal-list" direction="horizontal" class="flex flex-row gap-2">
			{#each items as item, index (item.id)}
				<DndPreview
					containerId="horizontal-list"
					position={index}
					show={dropPreview?.containerId === 'horizontal-list' && dropPreview?.position === index}
				/>
				<DndDraggable id={item.id}>
					<div class="w-32 h-24 flex items-center justify-center bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
						{item.label}
					</div>
				</DndDraggable>
			{/each}
			<DndPreview
				containerId="horizontal-list"
				position={items.length}
				show={dropPreview?.containerId === 'horizontal-list' && dropPreview?.position === items.length}
			/>
		</DndDroppable>
	</DndProvider>
</div>
