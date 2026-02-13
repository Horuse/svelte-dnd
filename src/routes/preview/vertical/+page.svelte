<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';

	let items = $state(
		Array.from({ length: 50 }, (_, i) => ({
			id: String(i + 1),
			label: `Item ${i + 1}`
		}))
	);


	const controller = new DragController();
	const dropPreview = $derived(controller.dropPreview);

	let hiddenId = $state<string | null>(null);
	const visibleItems = $derived(items.filter((item) => item.id !== hiddenId));

	const unsubStart = controller.onDragStart((id: string) => {
		hiddenId = id;
	});
	const unsubEnd = controller.onDragEnd(() => {
		hiddenId = null;
	});

	controller.onDrop((sourceId: string, _sourceData: any, _targetContainerId: string, position: number) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;

		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});

	onDestroy(() => {
		unsubStart();
		unsubEnd();
	});
</script>

<div class="h-full flex flex-col">
	<h1 class="text-2xl text-black dark:text-white font-bold mb-2">Vertical List</h1>
	<p class="text-neutral-500 mb-6">Drag items to reorder them vertically.</p>

	<DndProvider {controller}>
		<DndDroppable class="flex flex-col h-full overflow-y-auto space-y-2 max-w-xl p-4 bg-foreground border-2 border-second rounded-xl" id="vertical-list" direction="vertical">
			{#each visibleItems as item, index (item.id)}
				<DndPreview
					containerId="vertical-list"
					position={index}
					show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === index}
				/>

				<DndDraggable id={item.id}>
					<div class="drag-item">
						{item.label}
					</div>
				</DndDraggable>

				<DndPreview
						containerId="vertical-list"
						position={index+1}
						show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === index}
				/>
			{/each}

			<DndPreview
				containerId="vertical-list"
				position={visibleItems.length}
				show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === visibleItems.length}
			/>
		</DndDroppable>
	</DndProvider>
</div>
