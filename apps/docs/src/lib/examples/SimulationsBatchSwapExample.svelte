<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, sortable } from '@horuse/svelte-dnd'

	let teamA = $state(
		['Alice', 'Bob', 'Carol'].map((label, i) => ({ id: `a-${i}`, label }))
	)
	let teamB = $state(
		['Dave', 'Eve', 'Frank'].map((label, i) => ({ id: `b-${i}`, label }))
	)

	let busy = $state(false)

	const controller = new DndController()

	controller.onDrop(({ item: { id: sourceId }, target: { id: containerId, position } }) => {
		const fromA = teamA.findIndex((i) => i.id === sourceId)
		const fromB = teamB.findIndex((i) => i.id === sourceId)

		if (fromA !== -1) {
			if (containerId === 'team-a') {
				const updated = [...teamA]
				const [moved] = updated.splice(fromA, 1)
				updated.splice(position, 0, moved)
				teamA = updated
			} else {
				const item = teamA[fromA]
				teamA = teamA.filter((i) => i.id !== sourceId)
				const updated = [...teamB]
				updated.splice(position, 0, item)
				teamB = updated
			}
		} else if (fromB !== -1) {
			if (containerId === 'team-b') {
				const updated = [...teamB]
				const [moved] = updated.splice(fromB, 1)
				updated.splice(position, 0, moved)
				teamB = updated
			} else {
				const item = teamB[fromB]
				teamB = teamB.filter((i) => i.id !== sourceId)
				const updated = [...teamA]
				updated.splice(position, 0, item)
				teamA = updated
			}
		}
	})

	async function swapTeams() {
		if (busy) return
		busy = true
		const oldA = teamA
		const oldB = teamB
		await controller.simulateBatchSwap(
			[...oldA.map((i) => i.id), ...oldB.map((i) => i.id)],
			() => {
				teamA = oldB
				teamB = oldA
			}
		)
		busy = false
	}
</script>

<div class="flex flex-col gap-4">
	<button class="black-button p-2 px-6 self-start" onclick={swapTeams} disabled={busy}>
		Swap Teams
	</button>

	<DndProvider {controller}>
		<div class="flex gap-4">
			<div class="flex flex-col gap-2">
				<span class="text-sm text-neutral-500 font-semibold">Team A</span>
				<DndDroppable
					spacing={12} class="flex flex-col w-48 p-3 bg-foreground border-2 border-second rounded-xl"
					id="team-a"
					strategy={sortable()}
				>
					{#each teamA as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item">
								<span class="text-base font-medium">{item.label}</span>
							</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-semibold text-neutral-500">Team B</span>
				<DndDroppable
					spacing={12} class="flex flex-col w-48 p-3 bg-foreground border-2 border-second rounded-xl"
					id="team-b"
					strategy={sortable()}
				>
					{#each teamB as item, index (item.id)}
						<DndDraggable id={item.id} position={index}>
							<div class="drag-item">
								<span class="text-base font-medium">{item.label}</span>
							</div>
						</DndDraggable>
					{/each}
				</DndDroppable>
			</div>
		</div>
	</DndProvider>
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
