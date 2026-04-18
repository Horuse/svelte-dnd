<script lang="ts">
	import {
		DndProvider, DndDroppable, DndDraggable, DndController,
		SortableContainerStrategy, sortable,
		type DndMode, type DropZone, type DragSession, type Droppable,
	} from '@horuse/svelte-dnd'

	class PriorityStrategy extends SortableContainerStrategy {
		override readonly mode: DndMode = 'priority'

		override calculateDropZones(droppable: Droppable, _session: DragSession | null): DropZone[] {
			const containerId = droppable.id
			const r = droppable.element.getBoundingClientRect()
			const mid = r.top + r.height / 2
			return [
				{ containerId, position: 0, direction: 'vertical', rect: { x: r.x, y: r.y,  width: r.width, height: r.height / 2 } },
				{ containerId, position: 1, direction: 'vertical', rect: { x: r.x, y: mid, width: r.width, height: r.height / 2 } },
			]
		}
	}

	type Item = { id: string; label: string; priority: 'high' | 'low' | null }

	let inbox = $state<Item[]>([
		{ id: 'a', label: 'Fix critical bug', priority: null },
		{ id: 'b', label: 'Write docs', priority: null },
		{ id: 'c', label: 'Deploy hotfix', priority: null },
	])
	let triage = $state<Item[]>([])

	const controller = new DndController()

	controller.onDrop(({ item: { id: sourceId }, target: { id: targetContainerId, position } }) => {
		const isInbox = inbox.some((i) => i.id === sourceId)
		const item = { ...(isInbox ? inbox : triage).find((i) => i.id === sourceId)! }

		if (isInbox) inbox = inbox.filter((i) => i.id !== sourceId)
		else triage = triage.filter((i) => i.id !== sourceId)

		if (targetContainerId === 'triage') {
			item.priority = position === 0 ? 'high' : 'low'
			const updated = [...triage.filter((i) => i.id !== sourceId)]
			updated.splice(position, 0, item)
			triage = updated
		} else {
			item.priority = null
			inbox = [...inbox.filter((i) => i.id !== sourceId), item]
		}
	})
</script>

<div class="flex flex-col gap-4">
	<p class="text-sm text-neutral-500">Drag from Inbox to Triage — top half marks as high priority, bottom half as low.</p>

	<DndProvider {controller}>
		<div class="flex h-72 gap-4">
			<div class="flex flex-col w-56 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
				<h2 class="text-lg p-4 font-semibold text-neutral-500">Inbox</h2>
				<DndDroppable id="inbox" strategy={sortable()} spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3">
					{#each inbox as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item text-sm">{item.label}</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>

			<div class="flex flex-col w-56 shrink-0 h-full bg-foreground border-2 border-primary rounded-2xl">
				<h2 class="text-lg p-4 font-semibold text-neutral-500">Triage <span class="text-xs opacity-50">priority mode</span></h2>
				<DndDroppable id="triage" strategy={new PriorityStrategy()} spacing={8} class="p-3 h-full overflow-auto border-t-2 border-primary pt-3">
					<div class="zone-hint top">⬆ High</div>
					{#each triage as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item text-sm priority-{item.priority}">{item.label}</div>
						</DndDraggable>
					{/each}
					<div class="zone-hint bottom">⬇ Low</div>
				</DndDroppable>
			</div>
		</div>
	</DndProvider>
</div>

<style>
	.zone-hint {
		text-align: center;
		font-size: 0.6875rem;
		color: var(--color-neutral-500, #6b7280);
		padding: 0.15rem 0;
		pointer-events: none;
		user-select: none;
	}

	:global(.priority-high) {
		border-left: 3px solid var(--color-red-400, #f87171) !important;
	}

	:global(.priority-low) {
		border-left: 3px solid var(--color-neutral-500, #6b7280) !important;
	}

	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
