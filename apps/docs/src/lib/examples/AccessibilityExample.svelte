<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, defaultAnnouncements } from '@horuse/svelte-dnd'

	const columns: Record<string, string> = {
		todo: 'To Do',
		'in-progress': 'In Progress',
		done: 'Done',
	}

	type Item = { id: string; label: string }
	let board = $state<Record<string, Item[]>>({
		todo: [{ id: 'a', label: 'Write tests' }, { id: 'b', label: 'Fix bug #42' }],
		'in-progress': [{ id: 'c', label: 'Review PR' }],
		done: [{ id: 'd', label: 'Deploy v1' }],
	})

	let lastAnnouncement = $state('')

	const controller = new DndController({
		announcements: {
			...defaultAnnouncements,
			onDragStart: () => 'Picked up a task.',
			onDragOver: ({ current }) =>
				`Moving to "${columns[current.id] ?? current.id}", position ${current.position + 1}.`,
			onDrop: () => 'Task dropped.',
			onCancel: () => 'Move cancelled.',
		},
	})

	controller.onDragStart(() => { lastAnnouncement = 'Picked up a task.' })
	controller.onDragEnd(() => { setTimeout(() => { lastAnnouncement = '' }, 2000) })
	controller.onDrop(() => { lastAnnouncement = 'Task dropped.' })
	controller.onDropCancelled(() => { lastAnnouncement = 'Move cancelled.' })

	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		const srcCol = Object.keys(board).find((col) => board[col].some((i) => i.id === sourceId))!
		const item = board[srcCol].find((i) => i.id === sourceId)!
		board[srcCol] = board[srcCol].filter((i) => i.id !== sourceId)
		const dst = [...board[targetContainerId].filter((i) => i.id !== sourceId)]
		dst.splice(position, 0, item)
		board[targetContainerId] = dst
	})
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-neutral-500">Tab to focus a task, Enter/Space to pick up, arrow keys to move between columns.</p>

	<DndProvider {controller}>
		<div class="flex h-72 overflow-x-auto flex-row gap-4">
			{#each Object.entries(columns) as [id, label]}
				<div class="flex flex-col w-48 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
					<h2 class="text-lg p-4 font-semibold text-neutral-500">{label}</h2>
					<DndDroppable {id} spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3">
						{#each board[id] as item, index (item.id)}
							<DndDraggable id={item.id} position={index}>
								<div class="drag-item text-sm">{item.label}</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			{/each}
		</div>
	</DndProvider>

	<div class="flex items-center gap-2 min-h-9 px-4 py-2 rounded-xl border border-primary bg-foreground text-sm text-neutral-500">
		{#if lastAnnouncement}
			<span class="text-theme font-medium">Screen reader:</span>
			{lastAnnouncement}
		{:else}
			<span class="opacity-40">Screen reader announcements appear here…</span>
		{/if}
	</div>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
