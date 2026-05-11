<script lang="ts">
	import {
		DndProvider,
		DndDroppable,
		DndDraggable,
		DndController,
		sortable,
		defaultAnnouncements
	} from '@horuse/svelte-dnd'

	type Item = { id: string; label: string }

	const columnLabels: Record<string, string> = {
		todo: 'To Do',
		'in-progress': 'In Progress',
		done: 'Done'
	}

	let board = $state<Record<string, Item[]>>({
		todo: [
			{ id: 'a', label: 'Write tests' },
			{ id: 'b', label: 'Fix bug #42' },
			{ id: 'c', label: 'Refactor parser' }
		],
		'in-progress': [{ id: 'd', label: 'Review PR #87' }],
		done: [{ id: 'e', label: 'Deploy v1' }]
	})

	let announcements = $state<{ id: number; text: string }[]>([])
	let nextAnnouncementId = 0

	const findItem = (id: string): { item: Item; columnId: string; position: number } | null => {
		for (const [columnId, items] of Object.entries(board)) {
			const idx = items.findIndex((i) => i.id === id)
			if (idx !== -1) return { item: items[idx], columnId, position: idx }
		}
		return null
	}

	const pushAnnouncement = (text: string) => {
		if (!text) return
		announcements = [...announcements, { id: nextAnnouncementId++, text }].slice(-3)
	}

	const controller = new DndController({
		announcements: {
			...defaultAnnouncements,
			onDragStart: ({ item }) => {
				const found = findItem(item.id)
				return found
					? `Picked up "${found.item.label}" from ${columnLabels[found.columnId]}, position ${found.position + 1}.`
					: `Picked up item ${item.id}.`
			},
			onDragOver: ({ item, current }) => {
				const found = findItem(item.id)
				const itemLabel = found?.item.label ?? item.id
				return `"${itemLabel}" is over ${columnLabels[current.id] ?? current.id}, position ${current.position + 1}.`
			},
			onDrop: ({ item, target }) => {
				const found = findItem(item.id)
				const itemLabel = found?.item.label ?? item.id
				return `Dropped "${itemLabel}" into ${columnLabels[target.id] ?? target.id} at position ${target.position + 1}.`
			},
			onCancel: ({ item }) => {
				const found = findItem(item.id)
				return found ? `Cancelled moving "${found.item.label}".` : `Cancelled.`
			}
		}
	})

	controller.onDragStart((event) => pushAnnouncement(controller.announcements?.onDragStart?.(event) ?? ''))
	controller.onDragOver((event) => pushAnnouncement(controller.announcements?.onDragOver?.(event) ?? ''))
	controller.onDrop((event) => pushAnnouncement(controller.announcements?.onDrop?.(event) ?? ''))
	controller.onDropCancelled((event) => pushAnnouncement(controller.announcements?.onCancel?.(event) ?? ''))

	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		const srcCol = Object.keys(board).find((col) => board[col].some((i) => i.id === sourceId))
		if (!srcCol) return
		const item = board[srcCol].find((i) => i.id === sourceId)
		if (!item) return
		board[srcCol] = board[srcCol].filter((i) => i.id !== sourceId)
		const dst = [...board[targetContainerId].filter((i) => i.id !== sourceId)]
		dst.splice(position, 0, item)
		board[targetContainerId] = dst
	})
</script>

<div class="a11y-example flex flex-col gap-4">
	<div
		class="text-theme flex flex-wrap items-center gap-1 px-4 py-3 rounded-xl border-2 border-primary bg-foreground text-sm opacity-80"
	>
		Tab to focus a task &middot; <kbd>Space</kbd>/<kbd>Enter</kbd> to pick up &middot;
		<kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> to move &middot;
		<kbd>Home</kbd>/<kbd>End</kbd> to jump &middot; <kbd>Esc</kbd> to cancel.
	</div>

	<DndProvider {controller}>
		<div class="flex h-80 overflow-x-auto flex-row gap-4">
			{#each Object.entries(columnLabels) as [id, label] (id)}
				<div class="flex flex-col w-56 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
					<h2 class="text-lg p-4 font-semibold text-neutral-500">{label}</h2>
					<DndDroppable
						{id}
						strategy={sortable()}
						spacing={8}
						class="p-3 h-full overflow-auto border-t-2 border-primary pt-3"
					>
						{#each board[id] as item, index (item.id)}
							<DndDraggable id={item.id} position={index}>
								<div class="drag-item a11y-drag-item">{item.label}</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			{/each}
		</div>
	</DndProvider>

	<div
		class="flex flex-col gap-1 min-h-20 px-4 py-3 rounded-xl border border-primary bg-foreground text-sm"
	>
		<span class="text-xs uppercase tracking-wider text-neutral-500">Screen reader log</span>
		{#if announcements.length === 0}
			<span class="opacity-40">Announcements will appear here…</span>
		{:else}
			{#each announcements as entry, idx (entry.id)}
				<span
					class="announcement"
					class:announcement--latest={idx === announcements.length - 1}
				>
					{entry.text}
				</span>
			{/each}
		{/if}
	</div>
</div>

<style>
	kbd {
		display: inline-block;
		padding: 0 6px;
		margin: 0 2px;
		border-radius: 4px;
		border: 1px solid var(--color-primary-border);
		background: var(--color-primary);
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.75rem;
		line-height: 1.4;
		color: var(--color-theme);
	}

	.a11y-drag-item {
		font-size: 0.875rem;
		padding: 12px 14px;
		justify-content: flex-start;
	}

	.announcement {
		font-family: ui-monospace, SFMono-Regular, monospace;
		font-size: 0.78rem;
		opacity: 0.55;
		transition: opacity 200ms ease;
	}

	.announcement--latest {
		opacity: 1;
		color: var(--color-theme);
		font-weight: 500;
	}
</style>
