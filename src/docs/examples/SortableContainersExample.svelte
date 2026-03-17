<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '$lib/index.js';

	type Task = { id: string; label: string };
	type Column = { id: string; title: string; tasks: Task[] };

	let columns = $state<Column[]>([
		{
			id: 'backlog',
			title: 'Backlog',
			tasks: [
				{ id: 't1', label: 'Research API design' },
				{ id: 't2', label: 'Write migration scripts' },
				{ id: 't3', label: 'Set up CI pipeline' }
			]
		},
		{
			id: 'in-progress',
			title: 'In Progress',
			tasks: [
				{ id: 't4', label: 'Implement auth flow' },
				{ id: 't5', label: 'Build dashboard UI' }
			]
		},
		{
			id: 'review',
			title: 'Review',
			tasks: [
				{ id: 't6', label: 'Code review: payments' },
				{ id: 't7', label: 'QA: user settings' }
			]
		}
	]);

	const controller = new DndController();

	controller.onDrop((sourceId: string, sourceData: any, targetContainerId: string, position: number) => {
		if (sourceData.type === 'column') {
			const fromIndex = columns.findIndex((col) => col.id === sourceId);
			if (fromIndex === -1) return;

			const updated = [...columns];
			const [moved] = updated.splice(fromIndex, 1);
			updated.splice(position, 0, moved);
			columns = updated;
		} else {
			let sourceColIndex = -1;
			let sourceTaskIndex = -1;

			for (let i = 0; i < columns.length; i++) {
				const idx = columns[i].tasks.findIndex((t) => t.id === sourceId);
				if (idx !== -1) {
					sourceColIndex = i;
					sourceTaskIndex = idx;
					break;
				}
			}

			if (sourceColIndex === -1) return;

			const updated = columns.map((col) => ({
				...col,
				tasks: [...col.tasks]
			}));

			const [movedTask] = updated[sourceColIndex].tasks.splice(sourceTaskIndex, 1);

			const targetCol = updated.find((col) => col.id === targetContainerId);
			if (targetCol) {
				targetCol.tasks.splice(position, 0, movedTask);
			}

			columns = updated;
		}
	});
</script>

<div class="flex bg-foreground px-6 items-center gap-6 text-neutral-500 p-3 rounded-xl">
	<span>Debug: {controller.debugZones}</span>
	<button class="black-button p-2 px-6" onclick={() => controller.toggleDebugZones()}>Show debug zones</button>
	<p>- To see, start dragging</p>
</div>

<DndProvider {controller}>
	<DndDroppable id="board" direction="horizontal" data={{ accepts: 'column' }} class="flex flex-row h-125 overflow-x-auto space-x-4 w-full">
		{#each columns as column, colIndex (column.id)}
			<DndDraggable class="h-full" id={column.id} data={{ type: 'column' }} position={colIndex}>
				<div class="flex flex-col h-full shrink-0 w-72 bg-foreground border-2 border-primary rounded-2xl">
					<h2 data-dnd-handle class="column-header text-lg p-4 font-semibold text-neutral-500 cursor-grab">
						<span class="drag-handle">&#x2630;</span>
						{column.title}
					</h2>
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<DndDroppable id={column.id} direction="vertical" data={{ accepts: 'task' }} class="space-y-2 p-3 h-full border-t-2 border-primary pt-3">
						{#each column.tasks as task, taskIndex (task.id)}
							<DndDraggable id={task.id} data={{ type: 'task' }} position={taskIndex}>
								<div class="drag-item px-4 gap-3">
									<span class="truncate">{task.label}</span>
									<button data-dnd-no-drag class="black-button" onclick={() => alert("Test")}>Alert</button>
								</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			</DndDraggable>
		{/each}
	</DndDroppable>
</DndProvider>

<style>
	.column-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.drag-handle {
		font-size: 1rem;
		opacity: 0.4;
	}

	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 1rem;
	}
</style>
