<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd';

	let items = $state(
		Array.from({ length: 12 }, (_, i) => ({ id: String(i + 1), label: `Item ${i + 1}` }))
	);

	let scrollZoneRatio = $state(0.3);
	let maxSpeed = $state(30);
	let showDelay = $state(300);
	let collapseDelay = $state(200);

	const controller = new DndController();

	controller.onDrop((sourceId: string, _sourceData, _targetContainerId: string, position: number) => {
		const fromIndex = items.findIndex((item) => item.id === sourceId);
		if (fromIndex === -1) return;
		const updated = [...items];
		const [moved] = updated.splice(fromIndex, 1);
		updated.splice(position, 0, moved);
		items = updated;
	});

	function onScrollZoneRatioChange(e: Event) {
		scrollZoneRatio = Number((e.target as HTMLInputElement).value);
		controller.setScrollConfig({ scrollZoneRatio });
	}

	function onMaxSpeedChange(e: Event) {
		maxSpeed = Number((e.target as HTMLInputElement).value);
		controller.setScrollConfig({ maxSpeed });
	}

	function onShowDelayChange(e: Event) {
		showDelay = Number((e.target as HTMLInputElement).value);
		controller.setPreviewConfig({ showDelay });
	}

	function onCollapseDelayChange(e: Event) {
		collapseDelay = Number((e.target as HTMLInputElement).value);
		controller.setPreviewConfig({ collapseDelay });
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex bg-foreground flex-wrap gap-6 p-5 rounded-3xl border border-primary">
		<div class="flex flex-col gap-3">
			<h2 class="text-theme text-base font-semibold">Scroll config</h2>
			<label class="flex flex-col gap-1 text-neutral-500">
				<span class="text-sm">Scroll zone ratio: <strong class="text-theme">{scrollZoneRatio.toFixed(2)}</strong></span>
				<input type="range" min="0.05" max="0.5" step="0.05" value={scrollZoneRatio} oninput={onScrollZoneRatioChange} class="w-full max-w-xs" />
			</label>
			<label class="flex flex-col gap-1 text-neutral-500">
				<span class="text-sm">Max speed: <strong class="text-theme">{maxSpeed}</strong> px/frame</span>
				<input type="range" min="5" max="80" step="5" value={maxSpeed} oninput={onMaxSpeedChange} class="w-full max-w-xs" />
			</label>
		</div>

		<div class="flex flex-col gap-3">
			<h2 class="text-theme text-base font-semibold">Preview config</h2>
			<label class="flex flex-col gap-1 text-neutral-500">
				<span class="text-sm">Show delay: <strong class="text-theme">{showDelay}ms</strong></span>
				<input type="range" min="0" max="800" step="50" value={showDelay} oninput={onShowDelayChange} class="w-full max-w-xs" />
			</label>
			<label class="flex flex-col gap-1 text-neutral-500">
				<span class="text-sm">Collapse delay: <strong class="text-theme">{collapseDelay}ms</strong></span>
				<input type="range" min="0" max="600" step="50" value={collapseDelay} oninput={onCollapseDelayChange} class="w-full max-w-xs" />
			</label>
		</div>
	</div>

	<DndProvider {controller}>
		<DndDroppable
			class="flex space-y-3 flex-col h-96 overflow-y-auto max-w-xl p-4 bg-foreground border-2 border-second rounded-xl"
			id="configs-list"
			direction="vertical"
		>
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item">
						<span class="text-2xl">{item.id}</span>
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
