<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '$lib/index.js';

	let columns = $state<Record<string, { id: string; label: string; color: string }[]>>({
		blue: [
			{ id: '1', label: 'Design mockups', color: '#3b82f6' },
			{ id: '2', label: 'Write specs', color: '#3b82f6' },
			{ id: '3', label: 'Review PRs', color: '#3b82f6' }
		],
		green: [
			{ id: '4', label: 'Run tests', color: '#22c55e' },
			{ id: '5', label: 'Deploy staging', color: '#22c55e' },
			{ id: '6', label: 'Update docs', color: '#22c55e' }
		]
	});

	const columnMeta: Record<string, string> = {
		blue: 'Blue Team',
		green: 'Green Team'
	};

	const controller = new DndController();

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
		moved.color = targetContainerId === 'blue' ? '#3b82f6' : '#22c55e';
		updated[targetContainerId].splice(position, 0, moved);
		columns = updated;
	});
</script>

<DndProvider {controller}>
	{#snippet ghost({ data, itemId })}
		<div
			class="custom-ghost"
			style="background: {data?.color ?? '#888'};"
		>
			{data?.label ?? itemId}
		</div>
	{/snippet}

	<div data-dnd-scroll class="flex flex-row gap-4 overflow-x-auto h-125">
		{#each Object.entries(columns) as [columnId, columnItems] (columnId)}
			<div
				class="column-wrapper flex flex-col w-72 shrink-0 h-full bg-foreground border-2 rounded-2xl"
				class:column-blue={columnId === 'blue'}
				class:column-green={columnId === 'green'}
			>
				<h2 class="text-xl p-6 font-semibold text-neutral-500">{columnMeta[columnId]}</h2>
				<DndDroppable id={columnId} direction="vertical" class="space-y-3 p-3 border-t-2 border-primary pt-4 h-full">
					{#each columnItems as item, index (item.id)}
						<DndDraggable id={item.id} data={{ label: item.label, color: item.color }} position={index}>
							<div class="drag-item" style="border-left: 4px solid {item.color};">
								{item.label}
							</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>
		{/each}
	</div>
</DndProvider>

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

	.column-blue {
		border-color: rgba(59, 130, 246, 0.4);
		--dnd-preview-bg: rgba(59, 130, 246, 0.15);
		--dnd-preview-border: 2px dashed rgba(59, 130, 246, 0.5);
	}

	.column-green {
		border-color: rgba(34, 197, 94, 0.4);
		--dnd-preview-bg: rgba(34, 197, 94, 0.15);
		--dnd-preview-border: 2px solid rgba(34, 197, 94, 0.5);
		--dnd-preview-border-radius: 4px;
	}
</style>
