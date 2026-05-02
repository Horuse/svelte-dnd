<script lang="ts">
	import {DndProvider, DndDroppable, DndDraggable, DndController, sortable, autoScroll} from '@horuse/svelte-dnd';
	import { VList } from 'virtua/svelte';

	let items = $state(
		Array.from({ length: 5000 }, (_, i) => ({
			id: String(i + 1),
			label: `Item ${i + 1}`,
			height: 40 + ((i * 37) % 60)
		}))
	);

	let draggedIndex = $state<number | null>(null);

	const controller = new DndController({
		behaviors: [
			autoScroll({ zoneRatio: 0.3, maxSpeed: 100 }),
		]
	});

	controller.onDragStart(({ item: { id } }) => {
		const idx = items.findIndex((it) => it.id === id);
		draggedIndex = idx === -1 ? null : idx;
	});

	controller.onDragEnd(() => {
		draggedIndex = null;
	});

	// debug
	$effect(() => {
		const z = controller.dropZones;
		const dp = controller.dropPreview;
		if (controller.dragging) {
			const dr = document.querySelector('[data-dnd-drop-id="virtual-list"]') as HTMLElement | null;
			const slots = dr?.querySelectorAll('[data-dnd-slot]').length ?? -1;
			const cr = dr?.getBoundingClientRect();
			// console.log('slots(DOM):', slots, 'containerRect:', cr ? { top: cr.top, bottom: cr.bottom, height: cr.height } : null, 'zones:', z.length, 'positions:', z.map((zone) => zone.position).join(','), 'preview:', dp);
		}
	});

	controller.onDrop(({ item: { id: sourceId }, target: { position } }) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;
		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});

	const virtualSource = {
		itemCount: () => items.length
	};

	let keepMounted = $derived(draggedIndex === null ? [] : [draggedIndex]);
</script>

<DndProvider {controller}>
	<DndDroppable
		spacing={8}
		class="h-[calc(100vh-550px)] min-h-125 max-w-xl bg-foreground border-2 border-second rounded-xl overflow-hidden"
		id="virtual-list"
		strategy={sortable({ layout: 'vertical', virtual: virtualSource })}
	>
		<VList data={items} getKey={(item) => item.id} {keepMounted} style="padding: 12px;" data-dnd-scroll>
			{#snippet children(item, index)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item" style="height: {item.height}px">
						<span class="text-2xl">{item.id}</span>
					</div>
				</DndDraggable>
			{/snippet}
		</VList>
	</DndDroppable>
</DndProvider>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
