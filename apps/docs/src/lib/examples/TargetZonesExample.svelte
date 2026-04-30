<script lang="ts">
	import {
		DndProvider, DndDroppable, DndDraggable, DndController, target, sortable
	} from '@horuse/svelte-dnd';

	type Square = { id: string; label: string };
	type ZoneId = 'pool' | 'a' | 'b' | 'c';

	let zones = $state<Record<ZoneId, Square[]>>({
		pool: Array.from({ length: 6 }, (_, i) => ({ id: String(i + 1), label: String(i + 1) })),
		a: [],
		b: [],
		c: []
	});

	const targetZones: { id: ZoneId; label: string }[] = [
		{ id: 'a', label: 'Slot A' },
		{ id: 'b', label: 'Slot B' },
		{ id: 'c', label: 'Slot C' }
	];

	const controller = new DndController();

	controller.onDrop(async ({ item: { id }, target: { id: targetId, position } }) => {
		let sourceId: ZoneId | null = null;
		for (const zone of Object.keys(zones) as ZoneId[]) {
			if (zones[zone].some((s) => s.id === id)) {
				sourceId = zone;
				break;
			}
		}
		if (!sourceId) return;
		const source = sourceId;
		const target = targetId as ZoneId;

		const targetIsSlot = target !== 'pool';
		const occupied = targetIsSlot && source !== target && zones[target].length > 0;
		const evictedId = occupied ? zones[target][0].id : null;

		const applyMove = () => {
			const next = { ...zones };
			next[source] = [...next[source]];
			if (source !== target) next[target] = [...next[target]];

			const idx = next[source].findIndex((s) => s.id === id);
			const [moved] = next[source].splice(idx, 1);

			if (occupied) {
				const [evicted] = next[target].splice(0, 1);
				next[source].splice(idx, 0, evicted);
			}

			next[target].splice(position, 0, moved);
			zones = next;
		};

		if (evictedId) {
			// FLIP every source neighbour together with the evicted item.
			// When evicted lands at fromIdx, the items at indices ≥ fromIdx all
			// shift to make room — they each gain a non-zero rect delta. simulateBatchSwap
			// only animates the ids you pass in, so we include every source
			// item (minus the dragged one — its ghost flight already brought
			// it to the slot) plus the evicted id.
			const flipIds = zones[source].filter((s) => s.id !== id).map((s) => s.id);
			flipIds.push(evictedId);
			await controller.simulateBatchSwap(flipIds, applyMove);
		} else {
			applyMove();
		}
	});
</script>

<DndProvider {controller}>
	{#snippet ghost({ data, itemId })}
		{@const overSlot = !!controller.dropPreview && controller.dropPreview.containerId !== 'pool'}
		<div class="square" class:square--in-slot={overSlot}>
			{data?.label ?? itemId}
		</div>
	{/snippet}

	<div class="flex flex-col gap-6 max-w-2xl">
		<div class="flex flex-col gap-2">
			<h3 class="text-sm font-semibold text-neutral-500">Pool</h3>
			<DndDroppable
				id="pool"
				strategy={sortable({ layout: 'horizontal' })}
				spacing={12}
				class="flex bg-foreground border-2 border-primary rounded-2xl h-22 p-2.5"
			>
				{#each zones.pool as item, index (item.id)}
					<DndDraggable id={item.id} data={{ label: item.label }} position={index}>
						<div class="square">{item.label}</div>
					</DndDraggable>
				{/each}
			</DndDroppable>
		</div>

		<div class="grid grid-cols-3 gap-3">
			{#each targetZones as zone (zone.id)}
				<div class="flex flex-col gap-2">
					<h3 class="text-sm font-semibold text-neutral-500">{zone.label}</h3>
					<DndDroppable
						id={zone.id}
						strategy={target()}
						class="flex items-center justify-center h-52 p-2.5 bg-foreground border-2 border-dashed border-primary rounded-full"
					>
						{#each zones[zone.id] as item, index (item.id)}
							<DndDraggable id={item.id} data={{ label: item.label }} position={index}>
								<div class="square square--in-slot">{item.label}</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			{/each}
		</div>
	</div>
</DndProvider>

<style>
	@reference '#app.css';

	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}

	.square {
		@apply size-16 flex items-center justify-center bg-primary rounded-full border-2 border-primary-border text-neutral-500 text-lg font-bold transition-all duration-300;
	}
	.square:hover {
		@apply bg-primary-hover border-primary-hover-border;
	}
	.square--in-slot {
		@apply scale-200 bg-red-500/50 border-red-500/50 text-white;
	}
</style>
