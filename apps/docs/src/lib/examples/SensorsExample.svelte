<script lang="ts">
	import {
		DndProvider, DndDroppable, DndDraggable, DndController,
		PointerSensor, KeyboardSensor, Distance, Delay,
		type StartCondition
	} from '@horuse/svelte-dnd'

	let distanceValue = $state(5)
	let delayValue = $state(300)
	let delayTolerance = $state(8)

	let items = $state(
		Array.from({ length: 6 }, (_, i) => ({ id: String(i), label: `Item ${i + 1}` }))
	)

	function buildController(startConditions: StartCondition[]) {
		const ctrl = new DndController()
		ctrl.sensors = [
			new PointerSensor({ startConditions }),
			new KeyboardSensor()
		]
		ctrl.onDrop(({ item: { id: sourceId }, target: { position } }) => {
			const from = items.findIndex((i) => i.id === sourceId)
			if (from === -1) return
			const updated = [...items]
			const [moved] = updated.splice(from, 1)
			updated.splice(position, 0, moved)
			items = updated
		})
		return ctrl
	}

	let controller = $state(buildController([
		new Distance({ value: distanceValue }),
		new Delay({ value: delayValue, tolerance: delayTolerance })
	]))

	$effect(() => {
		controller = buildController([
			new Distance({ value: distanceValue }),
			new Delay({ value: delayValue, tolerance: delayTolerance })
		])
	})
</script>

<div class="flex flex-col gap-4 max-w-sm">
	<div class="flex flex-col gap-3 p-3 bg-foreground rounded-xl border border-second">
		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium">
				Distance: <span class="text-primary font-bold">{distanceValue}px</span>
			</span>
			<input
				type="range"
				min="1"
				max="50"
				bind:value={distanceValue}
				class="w-full accent-primary"
			/>
			<span class="text-xs text-neutral-500">Min movement to start drag immediately</span>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium">
				Delay: <span class="text-primary font-bold">{delayValue}ms</span>
			</span>
			<input
				type="range"
				min="0"
				max="1000"
				step="50"
				bind:value={delayValue}
				class="w-full accent-primary"
			/>
			<span class="text-xs text-neutral-500">Hold time before drag starts (touch)</span>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm font-medium">
				Tolerance: <span class="text-primary font-bold">{delayTolerance}px</span>
			</span>
			<input
				type="range"
				min="0"
				max="30"
				bind:value={delayTolerance}
				class="w-full accent-primary"
			/>
			<span class="text-xs text-neutral-500">Max movement during delay before cancel</span>
		</label>
	</div>

	<p class="text-sm text-neutral-500">
		Tab to focus, Enter/Space to pick up, arrow keys to move, Enter to drop
	</p>

	{#key controller}
	<DndProvider {controller}>
		<DndDroppable
			class="flex space-y-3 flex-col max-w-sm p-3 bg-foreground border-2 border-second rounded-xl"
			id="list"
		>
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index}>
					<div class="drag-item">
						<span class="text-lg">{item.label}</span>
					</div>
				</DndDraggable>
			{/each}
		</DndDroppable>
	</DndProvider>
	{/key}
</div>

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
