<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, sortable, autoScroll } from '@horuse/svelte-dnd';
	import { VList, type VListHandle } from 'virtua/svelte';

	let items = $state(
		Array.from({ length: 5000 }, (_, i) => ({
			id: String(i + 1),
			height: 40 + ((i * 37) % 60)
		}))
	);

	let draggedIndex = $state<number | null>(null);
	let vlist = $state<VListHandle | undefined>();

	const controller = new DndController({
		behaviors: [autoScroll({ zoneRatio: 0.3, maxSpeed: 100 })]
	});

	controller.onDragStart(({ item: { id } }) => {
		draggedIndex = items.findIndex((it) => it.id === id);
	});

	controller.onDragEnd(() => {
		draggedIndex = null;
	});

	// virtua keeps measured sizes in an index-keyed cache, so after we reorder
	// the items array virtua's internal $fixScrollJump compensates by a few
	// pixels. Pin a non-shifted slot's viewport top before the reorder, then
	// after Svelte + virtua flush, pull scroll back by the drift it gained.
	function compensateScroll(fromIndex: number, toIndex: number, sourceId: string) {
		const scrollEl = document.querySelector('[data-dnd-drop-id="virtual-list"] [data-dnd-scroll]') as HTMLElement | null;
		if (!scrollEl) return;
		const viewport = scrollEl.getBoundingClientRect();
		const lo = Math.min(fromIndex, toIndex);
		const hi = Math.max(fromIndex, toIndex);

		// Find a stable anchor: visible, not the dragged item, position outside
		// the [lo..hi] reorder window so its array index doesn't change.
		let anchorId: string | undefined;
		let anchorOldTop: number | undefined;
		for (const slot of scrollEl.querySelectorAll('[data-dnd-slot]')) {
			const id = slot.querySelector('[data-dnd-drag-id]')?.getAttribute('data-dnd-drag-id');
			if (!id || id === sourceId) continue;
			const idx = items.findIndex((it) => it.id === id);
			if (idx >= lo && idx <= hi) continue;
			const r = slot.getBoundingClientRect();
			if (r.top < viewport.top || r.top > viewport.bottom) continue;
			anchorId = id;
			anchorOldTop = r.top;
			break;
		}
		if (!anchorId || anchorOldTop === undefined) return;

		queueMicrotask(() => queueMicrotask(() => requestAnimationFrame(() => {
			const slot = [...scrollEl.querySelectorAll('[data-dnd-slot]')]
				.find((s) => s.querySelector('[data-dnd-drag-id]')?.getAttribute('data-dnd-drag-id') === anchorId) as HTMLElement | undefined;
			if (!slot) return;
			const delta = slot.getBoundingClientRect().top - anchorOldTop!;
			if (delta !== 0) vlist?.scrollBy(delta);
		})));
	}

	controller.onDrop(({ item: { id: sourceId }, target: { position } }) => {
		const fromIndex = items.findIndex((it) => it.id === sourceId);
		if (fromIndex === -1) return;

		compensateScroll(fromIndex, position, sourceId);

		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});

	const virtualSource = { itemCount: () => items.length };
	let keepMounted = $derived(draggedIndex === null ? [] : [draggedIndex]);
</script>

<DndProvider {controller}>
	<DndDroppable
		spacing={8}
		class="h-[calc(100vh-550px)] min-h-125 max-w-xl bg-foreground border-2 border-second rounded-xl overflow-hidden"
		id="virtual-list"
		strategy={sortable({ layout: 'vertical', virtual: virtualSource })}
	>
		<VList bind:this={vlist} data={items} getKey={(it) => it.id} {keepMounted} style="padding: 12px;" data-dnd-scroll>
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
