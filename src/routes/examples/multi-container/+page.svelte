<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DragController } from '$lib/index.js';
	import Description from './description.md';

	let columns = $state<Record<string, { id: string; label: string }[]>>({
		todo: [
			{ id: '1', label: 'Research API design' },
			{ id: '2', label: 'Write unit tests' },
			{ id: '3', label: 'Update documentation' }
		],
		'in-progress': [
			{ id: '4', label: 'Implement drag handler' },
			{ id: '5', label: 'Style drop preview' }
		],
		done: [
			{ id: '6', label: 'Set up project' },
			{ id: '7', label: 'Create components' }
		]
	});

	const columnMeta: Record<string, string> = {
		todo: 'To Do',
		'in-progress': 'In Progress',
		done: 'Done'
	};

	const controller = new DragController();

	controller.onDrop((sourceId: string, _sourceData: any, targetContainerId: string, position: number) => {
		let sourceColumn = '';
		let sourceIndex = -1;

		for (const [colId, colItems] of Object.entries(columns)) {
			const idx = colItems.findIndex((item) => item.id === sourceId);
			if (idx !== -1) {
				sourceColumn = colId;
				sourceIndex = idx;
				break;
			}
		}

		if (sourceIndex === -1) return;

		const updated = { ...columns };
		updated[sourceColumn] = [...updated[sourceColumn]];
		updated[targetContainerId] = sourceColumn === targetContainerId
			? updated[targetContainerId]
			: [...updated[targetContainerId]];

		const [moved] = updated[sourceColumn].splice(sourceIndex, 1);
		updated[targetContainerId].splice(position, 0, moved);
		columns = updated;
	});
</script>

<div class="mx-auto max-w-5xl flex mb-32 gap-6 flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		<div data-dnd-scroll class="flex h-125 overflow-x-auto flex-row gap-4">
			{#each Object.entries(columns) as [columnId, columnItems] (columnId)}
				<div class="flex flex-col w-72 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
					<h2 class="text-xl p-6 font-semibold text-neutral-500">{columnMeta[columnId]}</h2>
					<DndDroppable id={columnId} direction="vertical" class="space-y-3 overflow-y-auto p-3 border-t-2 border-primary pt-4 h-full">
						{#each columnItems as item, index (item.id)}
							<DndDraggable id={item.id} position={index}>
								<div class="drag-item">
									{item.label}
								</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			{/each}
		</div>
	</DndProvider>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
