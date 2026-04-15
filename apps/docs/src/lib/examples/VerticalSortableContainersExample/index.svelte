<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd';

	type Item = { id: string; label: string; height: number };
	type Container = { id: string; title: string; items: Item[] };

	let containers = $state<Container[]>([
		{
			id: 'todo',
			title: 'To Do',
			items: [
				{ id: 'i1', label: 'Design new landing page', height: 60 },
				{ id: 'i2', label: 'Write API documentation', height: 80 },
				{ id: 'i3', label: 'Set up monitoring', height: 60 },
			]
		},
		{
			id: 'in-progress',
			title: 'In Progress',
			items: [
				{ id: 'i4', label: 'Implement auth flow', height: 70 },
				{ id: 'i5', label: 'Build dashboard UI', height: 100 },
			]
		},
		{
			id: 'done',
			title: 'Done',
			items: [
				{ id: 'i6', label: 'Project setup', height: 60 },
				{ id: 'i7', label: 'Database schema', height: 80 },
			]
		}
	]);

	const controller = new DndController();

	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		let sourceContainerIndex = -1;
		let sourceItemIndex = -1;

		for (let i = 0; i < containers.length; i++) {
			const idx = containers[i].items.findIndex((t) => t.id === sourceId);
			if (idx !== -1) {
				sourceContainerIndex = i;
				sourceItemIndex = idx;
				break;
			}
		}

		if (sourceContainerIndex === -1) return;

		const updated = containers.map((c) => ({ ...c, items: [...c.items] }));
		const [movedItem] = updated[sourceContainerIndex].items.splice(sourceItemIndex, 1);

		const targetContainer = updated.find((c) => c.id === targetContainerId);
		if (targetContainer) {
			targetContainer.items.splice(position, 0, movedItem);
		}

		containers = updated;
	});
</script>

<div class="flex flex-col gap-4 w-full max-w-lg mx-auto">
	<DndProvider {controller}>
		{#each containers as container, containerIndex (container.id)}
			<DndDroppable spacing={8} id={container.id} direction="vertical" accepts="task" class="flex flex-col p-3 bg-foreground border-2 border-primary rounded-2xl min-h-20">
				<div class="text-lg font-semibold text-neutral-500 pb-2 border-b-2 border-primary mb-1">
					{container.title}
					<span class="text-sm font-normal ml-2 opacity-50">({container.items.length})</span>
				</div>
				{#each container.items as item, itemIndex (item.id)}
					<DndDraggable id={item.id} type="task" position={itemIndex}>
						<div class="drag-item px-4" style="height: {item.height}px">
							<span class="truncate">{item.label}</span>
						</div>
					</DndDraggable>
				{/each}
			</DndDroppable>
		{/each}
	</DndProvider>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 1rem;
	}
</style>
