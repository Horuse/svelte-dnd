<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';

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
	const dropPreview = $derived(controller.dropPreview);

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

		let targetIndex = position;
		if (sourceColumn === targetContainerId && sourceIndex < position) {
			targetIndex = position - 1;
		}

		updated[targetContainerId].splice(targetIndex, 0, moved);
		columns = updated;
	});
</script>

<div>
	<h1 class="text-2xl font-bold mb-2">Multi Container</h1>
	<p class="text-gray-600 mb-6">Drag items between columns in a kanban-style board.</p>

	<DndProvider {controller}>
		<div class="flex flex-row gap-4">
			{#each Object.entries(columns) as [columnId, columnItems] (columnId)}
				<div class="flex flex-col w-64 bg-gray-50 rounded-lg p-3">
					<h2 class="text-sm font-semibold uppercase text-gray-500 mb-3">{columnMeta[columnId]}</h2>
					<DndDroppable id={columnId} direction="vertical" class="flex-1">
						{#each columnItems as item, index (item.id)}
							<DndPreview
								containerId={columnId}
								position={index}
								show={dropPreview?.containerId === columnId && dropPreview?.position === index}
							/>
							<DndDraggable id={item.id}>
								<div class="p-3 mb-2 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-sm">
									{item.label}
								</div>
							</DndDraggable>
						{/each}
						<DndPreview
							containerId={columnId}
							position={columnItems.length}
							show={dropPreview?.containerId === columnId && dropPreview?.position === columnItems.length}
						/>
					</DndDroppable>
				</div>
			{/each}
		</div>
	</DndProvider>
</div>
