<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd';

	let items = $state(
		Array.from({ length: 50 }, (_, i) => ({
			id: String(i + 1),
			label: `Item ${i + 1}`,
			height: Math.floor(Math.random() * (100 - 50 + 1)) + 50
		}))
	);

	let scrollZoneRatio = $state(0.3);
	let maxSpeed = $state(30);

	const controller = new DndController({ scrollZoneRatio, maxSpeed });

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
</script>

<div class="flex flex-col gap-6">
	<div class="flex bg-foreground flex-col items-start gap-4 text-neutral-500 p-5 rounded-3xl border border-primary">
		<h1 class="text-theme text-xl">Scroll config</h1>
		<div class="flex flex-col gap-3 w-full">
			<label class="flex flex-col gap-1">
				<span class="text-sm">Scroll zone ratio: <strong class="text-theme">{scrollZoneRatio.toFixed(2)}</strong></span>
				<input
					type="range"
					min="0.05"
					max="0.5"
					step="0.05"
					value={scrollZoneRatio}
					oninput={onScrollZoneRatioChange}
					class="w-full max-w-xs"
				/>
			</label>
			<label class="flex flex-col gap-1">
				<span class="text-sm">Max speed: <strong class="text-theme">{maxSpeed}</strong> px/frame</span>
				<input
					type="range"
					min="5"
					max="80"
					step="5"
					value={maxSpeed}
					oninput={onMaxSpeedChange}
					class="w-full max-w-xs"
				/>
			</label>
		</div>
	</div>

	<DndProvider {controller}>
		<DndDroppable class="flex space-y-4 flex-col h-[calc(100vh-550px)] min-h-125 overflow-y-auto max-w-xl p-4 bg-foreground border-2 border-second rounded-xl" id="vertical-list" direction="vertical">
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
