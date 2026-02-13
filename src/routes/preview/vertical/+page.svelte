<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';

	let items = $state([
		{ id: '1', label: 'Item 1' },
		{ id: '2', label: 'Item 2' },
		{ id: '3', label: 'Item 3' },
		{ id: '4', label: 'Item 4' },
		{ id: '5', label: 'Item 5' }
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

<div class="max-w-md mx-auto">
	<h1 class="text-2xl font-bold mb-2">Vertical List</h1>
	<p class="text-gray-600 mb-6">Drag items to reorder them vertically.</p>

	<DndProvider {controller}>
		<DndDroppable id="vertical-list" direction="vertical">
			{#each items as item, index (item.id)}
				<DndPreview
					containerId="vertical-list"
					position={index}
					show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === index}
				/>

				<DndDraggable id={item.id}>
					<div class="p-4 mb-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
						{item.label}
					</div>
				</DndDraggable>
			{/each}

			<DndPreview
				containerId="vertical-list"
				position={items.length}
				show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === items.length}
			/>
		</DndDroppable>
	</DndProvider>
</div>
