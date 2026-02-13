<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';
	import Description from './description.md';

	const colors = ['#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7'];

	let items = $state(
		colors.map((color, i) => ({
			id: String(i + 1),
			label: `Item ${i + 1}`,
			color
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

<div class="h-full mx-auto max-w-5xl gap-6 flex flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		{#snippet ghost({ data, itemId })}
			<div
				class="custom-ghost"
				style="background: {data?.color ?? '#888'};"
			>
				{data?.label ?? itemId}
			</div>
		{/snippet}

		<DndDroppable class="flex flex-col space-y-2 max-w-xl p-4 bg-foreground border-2 border-second rounded-xl" id="custom-ghost-list" direction="vertical">
			{#each visibleItems as item, index (item.id)}
				<DndPreview
					containerId="custom-ghost-list"
					position={index}
					show={dropPreview?.containerId === 'custom-ghost-list' && dropPreview?.position === index}
				/>

				<DndDraggable id={item.id} data={{ label: item.label, color: item.color }}>
					<div class="drag-item" style="border-left: 4px solid {item.color};">
						{item.label}
					</div>
				</DndDraggable>
			{/each}

			<DndPreview
				containerId="custom-ghost-list"
				position={visibleItems.length}
				show={dropPreview?.containerId === 'custom-ghost-list' && dropPreview?.position === visibleItems.length}
			/>
		</DndDroppable>
	</DndProvider>
</div>

<style>
	.custom-ghost {
		padding: 12px 20px;
		border-radius: 10px;
		color: white;
		font-weight: 600;
		font-size: 14px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
	}
</style>
