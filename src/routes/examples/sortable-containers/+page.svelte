<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '$lib/index.js';
	import { onDestroy } from 'svelte';
	import Description from './description.md';

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

	const controller = new DragController();
	const dropPreview = $derived(controller.dropPreview);

	let hiddenId = $state<string | null>(null);
	let draggedType = $state<string | null>(null);

	const visibleColumns = $derived(
		draggedType === 'column'
			? columns.filter((col) => col.id !== hiddenId)
			: columns
	);

	function getVisibleTasks(tasks: Task[]) {
		if (draggedType === 'task') {
			return tasks.filter((t) => t.id !== hiddenId);
		}
		return tasks;
	}

	const unsubStart = controller.onDragStart((id: string) => {
		hiddenId = id;
		draggedType = controller.draggedType;
	});
	const unsubEnd = controller.onDragEnd(() => {
		hiddenId = null;
		draggedType = null;
	});

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

	function stopPropagation(e: PointerEvent) {
		e.stopPropagation();
	}
	// controller.toggleDebugZones()

	onDestroy(() => {
		unsubStart();
		unsubEnd();
	});
</script>

<div class="mx-auto max-w-5xl flex mb-32 gap-6 flex-col">
	<div class="prose max-w-3xl">
		<Description />
	</div>

	<DndProvider {controller}>
		<DndDroppable id="board" direction="horizontal" data={{ accepts: 'column' }} class="flex flex-row space-x-4 h-125">
			{#each visibleColumns as column, colIndex (column.id)}
				<DndPreview
					containerId="board"
					position={colIndex}
					direction="horizontal"
					show={dropPreview?.containerId === 'board' && dropPreview?.position === colIndex}
				/>
				<DndDraggable id={column.id} data={{ type: 'column' }}>
					<div class="column-card flex flex-col w-72 h-full bg-foreground border-2 border-primary rounded-2xl">
						<h2 class="column-header text-lg p-4 font-semibold text-neutral-500 cursor-grab">
							<span class="drag-handle">&#x2630;</span>
							{column.title}
						</h2>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div onpointerdown={stopPropagation}>
							<DndDroppable id={column.id} direction="vertical" data={{ accepts: 'task' }} class="space-y-2 p-3 border-t-2 border-primary pt-3">
								{@const visible = getVisibleTasks(column.tasks)}
								{#each visible as task, taskIndex (task.id)}
									<DndPreview
										containerId={column.id}
										position={taskIndex}
										show={dropPreview?.containerId === column.id && dropPreview?.position === taskIndex}
									/>
									<DndDraggable id={task.id} data={{ type: 'task' }}>
										<div class="drag-item">
											{task.label}
										</div>
									</DndDraggable>
								{/each}
								<DndPreview
									containerId={column.id}
									position={visible.length}
									show={dropPreview?.containerId === column.id && dropPreview?.position === visible.length}
								/>
							</DndDroppable>
						</div>
					</div>
				</DndDraggable>
			{/each}
			<DndPreview
				containerId="board"
				position={visibleColumns.length}
				direction="horizontal"
				show={dropPreview?.containerId === 'board' && dropPreview?.position === visibleColumns.length}
			/>
		</DndDroppable>
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
		--dnd-preview-border-radius: 12px;
	}
</style>
