<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, sortable } from '@horuse/svelte-dnd'

	let items = $state(
		['Delta', 'Alpha', 'Gamma', 'Beta', 'Epsilon'].map((label, i) => ({ id: String(i), label }))
	)

	let history = $state<{ id: string; from: number; to: number }[]>([])
	let busy = $state(false)

	const controller = new DndController()

	controller.onDrop(({ item: { id: sourceId }, target: { position } }) => {
		const from = items.findIndex((i) => i.id === sourceId)
		if (from === -1) return
		history.push({ id: sourceId, from, to: position })
		const updated = [...items]
		const [moved] = updated.splice(from, 1)
		updated.splice(position, 0, moved)
		items = updated
	})

	async function autoSort() {
		if (busy) return
		busy = true
		const sorted = [...items].sort((a, b) => a.label.localeCompare(b.label))
		await controller.animateLayout(() => { items = sorted })
		busy = false
	}

	async function undo() {
		if (busy || history.length === 0) return
		busy = true
		const last = history.pop()!
		const item = items[last.to]
		await controller.animateItem(item.id, {
			to: { containerId: 'list', position: last.from },
			style: 'return'
		})
		const updated = [...items]
		const [moved] = updated.splice(last.to, 1)
		updated.splice(last.from, 0, moved)
		items = updated
		busy = false
	}
</script>

<div class="flex flex-col gap-4 max-w-sm">
	<div class="flex gap-3">
		<button class="black-button p-2 px-6" onclick={autoSort} disabled={busy}>Sort A→Z</button>
		<button class="black-button p-2 px-6" onclick={undo} disabled={busy || history.length === 0}>
			Undo ({history.length})
		</button>
	</div>

	<DndProvider {controller}>
		<DndDroppable
			spacing={12} class="flex flex-col h-72 overflow-y-auto max-w-sm p-3 bg-foreground border-2 border-second rounded-xl"
			id="list"
			strategy={sortable()}
		>
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item">
						<span class="text-lg font-medium">{item.label}</span>
					</div>
				</DndDraggable>
			{/each}
		</DndDroppable>
	</DndProvider>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
