<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';

	let items = $state([
		{ id: '1', label: 'Tile 1', color: 'bg-blue-100' },
		{ id: '2', label: 'Tile 2', color: 'bg-green-100' },
		{ id: '3', label: 'Tile 3', color: 'bg-yellow-100' },
		{ id: '4', label: 'Tile 4', color: 'bg-red-100' },
		{ id: '5', label: 'Tile 5', color: 'bg-purple-100' },
		{ id: '6', label: 'Tile 6', color: 'bg-pink-100' },
		{ id: '7', label: 'Tile 7', color: 'bg-indigo-100' },
		{ id: '8', label: 'Tile 8', color: 'bg-teal-100' }
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
	<h1 class="text-2xl font-bold mb-2">Grid</h1>
	<p class="text-gray-600 mb-6">Drag tiles to rearrange them in a grid layout.</p>

	<DndProvider {controller}>
		<DndDroppable id="grid" direction="grid" class="flex flex-wrap gap-3">
			{#each items as item, index (item.id)}
				<DndPreview
					containerId="grid"
					position={index}
					show={dropPreview?.containerId === 'grid' && dropPreview?.position === index}
				/>
				<DndDraggable id={item.id} class="w-28 h-28 flex items-center justify-center rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow {item.color}">
					{item.label}
				</DndDraggable>
			{/each}
			<DndPreview
				containerId="grid"
				position={items.length}
				show={dropPreview?.containerId === 'grid' && dropPreview?.position === items.length}
			/>
		</DndDroppable>
	</DndProvider>
</div>
