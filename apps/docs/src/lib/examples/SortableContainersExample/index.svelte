<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd';
	import TrashZone from './TrashZone.svelte';

	type Task = { id: string; label: string; height: number  };
	type Column = { id: string; title: string; tasks: Task[] };

	let columns = $state<Column[]>([
		{
			id: 'backlog',
			title: 'Backlog',
			tasks: [
				{ id: 't1', label: 'Research API design', height: 60 + Math.floor(Math.random() * 80) },
				{ id: 't2', label: 'Write migration scripts', height: 60 + Math.floor(Math.random() * 80) },
				{ id: 't3', label: 'Set up CI pipeline', height: 60 + Math.floor(Math.random() * 80) }
			]
		},
		{
			id: 'in-progress',
			title: 'In Progress',
			tasks: [
				{ id: 't4', label: 'Implement auth flow', height: 60 + Math.floor(Math.random() * 80) },
				{ id: 't5', label: 'Build dashboard UI', height: 60 + Math.floor(Math.random() * 80) }
			]
		},
		{
			id: 'review',
			title: 'Review',
			tasks: [
				{ id: 't6', label: 'Code review: payments', height: 50 },
				{ id: 't7', label: 'QA: user settings', height: 120 }
			]
		}
	]);

	const controller = new DndController();


	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		if (targetContainerId === 'trash-zone') return

		if (columns.some((col) => col.id === sourceId)) {
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

	function handleRemove(taskId: string, columnId: string) {
		const col = columns.find(c => c.id === columnId);
		if (!col) return null;

		const taskIndex = col.tasks.findIndex(t => t.id === taskId);
		if (taskIndex === -1) return null;

		const [task] = col.tasks.splice(taskIndex, 1);
		columns = columns.map(c => c.id === columnId ? { ...c, tasks: [...c.tasks] } : c);
		return { id: task.id, label: task.label, columnId, position: taskIndex };
	}

	function handleRestore(task: { id: string; label: string; columnId: string; position: number }) {
		const col = columns.find(c => c.id === task.columnId);
		if (!col) return;
		col.tasks.splice(task.position, 0, { id: task.id, label: task.label });
		columns = [...columns];
	}

	async function moveBacklogToInProgress() {
		const backlog = columns.find(c => c.id === 'backlog');
		const inProgress = columns.find(c => c.id === 'in-progress');
		if (!backlog || backlog.tasks.length === 0 || !inProgress) return;

		const task = backlog.tasks[0];
		const toPosition = inProgress.tasks.length;

		await controller.simulateDrop(task.id, 'backlog', 'in-progress', toPosition);

		backlog.tasks.splice(0, 1);
		inProgress.tasks.splice(toPosition, 0, task);
		columns = [...columns];
	}
</script>

<div class="flex flex-col relative items-start gap-6">
	<div class="flex bg-foreground px-5 flex-col items-start gap-6 text-neutral-500 p-4 rounded-3xl border border-primary">
		<h1 class="text-theme text-xl">Control panel</h1>
		<div class="flex items-center gap-6">

			<button class="black-button p-2 px-6" onclick={() => controller.toggleDebugZones()}>Show debug zones</button>
			<p>- To see, start dragging</p>
		</div>

		<button class="black-button p-2 px-6" onclick={moveBacklogToInProgress}>Move backlog[0] → In Progress</button>
	</div>



	<DndProvider {controller}>
		<DndDroppable id="board" direction="horizontal" accepts="column" spacing={16} class="flex flex-row h-125 overflow-x-auto w-full">
			{#each columns as column, colIndex (column.id)}
				<DndDraggable class="h-full" id={column.id} type="column" position={colIndex}>
					<div class="flex flex-col h-full shrink-0 w-72 bg-foreground border-2 border-primary rounded-2xl">
						<h2 data-dnd-handle class="column-header text-lg p-4 font-semibold text-neutral-500 cursor-grab">
							<span class="drag-handle">&#x2630;</span>
							{column.title}
						</h2>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<DndDroppable id={column.id} direction="vertical" accepts="task" spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3">
							{#each column.tasks as task, taskIndex (task.id)}
								<DndDraggable id={task.id} type="task" data={{ label: task.label, columnId: column.id }} position={taskIndex}>
									<div class="drag-item px-4 gap-3" style="height: {task.height}px">
										<span class="truncate">{task.label}</span>
										<button data-dnd-no-drag class="black-button" onclick={() => alert('Test')}>Alert</button>
									</div>
								</DndDraggable>
							{/each}
						</DndDroppable>
					</div>
				</DndDraggable>
			{/each}
		</DndDroppable>

		<TrashZone onRemove={handleRemove} onRestore={handleRestore} />
	</DndProvider>

</div>
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
