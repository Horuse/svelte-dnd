<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';
	import Description from './description.md';

	let items = $state(
			Array.from({ length: 50 }, (_, i) => ({
				id: String(i + 1),
				label: `Item ${i + 1}`,
				height: Math.floor(Math.random() * (100 - 50 + 1)) + 50
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

<div class="mx-auto max-w-5xl mb-32 flex gap-6 flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		<DndDroppable class="flex flex-col h-[calc(100vh-450px)] min-h-125 overflow-y-auto max-w-xl p-4 bg-foreground border-2 border-second rounded-xl" id="vertical-list" direction="vertical">
			{#each items as item, index (item.id)}
				<DndDraggable class="pb-4" id={item.id}>
					<div class="drag-item">
						<span class="text-2xl">{index}</span>
					</div>
				</DndDraggable>
			{/each}

			<DndPreview
				containerId="vertical-list"
				position={visibleItems.length}
				show={dropPreview?.containerId === 'vertical-list' && dropPreview?.position === visibleItems.length}
			/>
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