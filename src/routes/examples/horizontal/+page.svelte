<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';
	import Description from './description.md';

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

<div class="mx-auto max-w-5xl mb-32 gap-6 flex flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		<DndDroppable id="horizontal-list" direction="horizontal" class="flex space-x-2 overflow-x-auto  p-4 bg-foreground border-2 border-second rounded-xl">
			{#each visibleItems as item, index (item.id)}
				<DndPreview
					containerId="horizontal-list"
					position={index}
					direction="horizontal"
					show={dropPreview?.containerId === 'horizontal-list' && dropPreview?.position === index}
				/>

				<DndDraggable id={item.id}>
					<div class="drag-item p-5 text-xl">
						{item.label}
					</div>
				</DndDraggable>

				<DndPreview
					containerId="horizontal-list"
					position={index+ 1}
					direction="horizontal"
					show={dropPreview?.containerId === 'horizontal-list' && dropPreview?.position === index}
				/>
			{/each}

			<DndPreview
				containerId="horizontal-list"
				position={visibleItems.length}
				direction="horizontal"
				show={dropPreview?.containerId === 'horizontal-list' && dropPreview?.position === visibleItems.length}
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
