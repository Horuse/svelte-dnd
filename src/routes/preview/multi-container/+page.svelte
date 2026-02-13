<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';

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

	let hiddenId = $state<string | null>(null);

	function getVisibleItems(items: { id: string; label: string }[]) {
		return items.filter((item) => item.id !== hiddenId);
	}

	const unsubStart = controller.onDragStart((id: string) => {
		hiddenId = id;
	});
	const unsubEnd = controller.onDragEnd(() => {
		hiddenId = null;
	});

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

	onDestroy(() => {
		unsubStart();
		unsubEnd();
	});
</script>

<div class="h-full flex flex-col">
	<h1 class="text-2xl text-black dark:text-white font-bold mb-2">Multi Container</h1>
	<p class="text-neutral-500 mb-6">Drag items between columns in a kanban-style board.</p>

	<DndProvider {controller}>
		<div class="flex flex-row gap-4 h-full">
			{#each Object.entries(columns) as [columnId, columnItems] (columnId)}
				{@const visible = getVisibleItems(columnItems)}
				<div class="flex flex-col w-72 h-full bg-foreground border-2 border-primary rounded-2xl">
					<h2 class="text-xl p-6 font-semibold text-neutral-500">{columnMeta[columnId]}</h2>
					<DndDroppable id={columnId} direction="vertical" class="space-y-3 p-3 border-t-2 border-primary pt-4 h-full">
						{#each visible as item, index (item.id)}
							<DndPreview
								containerId={columnId}
								position={index}
								show={dropPreview?.containerId === columnId && dropPreview?.position === index}
							/>
							<DndDraggable id={item.id}>
								<div class="drag-item">
									{item.label}
								</div>
							</DndDraggable>
						{/each}
						<DndPreview
							containerId={columnId}
							position={visible.length}
							show={dropPreview?.containerId === columnId && dropPreview?.position === visible.length}
						/>
					</DndDroppable>
				</div>
			{/each}
		</div>
	</DndProvider>
</div>
