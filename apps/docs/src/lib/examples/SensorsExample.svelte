<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController, PointerSensor, KeyboardSensor } from '@horuse/svelte-dnd'

	type Mode = 'both' | 'pointer-only' | 'keyboard-only'
	let activeMode = $state<Mode>('both')

	let items = $state(
		Array.from({ length: 6 }, (_, i) => ({ id: String(i), label: `Item ${i + 1}` }))
	)

	function buildController(mode: Mode) {
		const ctrl = new DndController()
		ctrl.sensors =
			mode === 'both'
				? [new PointerSensor(), new KeyboardSensor(ctrl)]
				: mode === 'pointer-only'
					? [new PointerSensor()]
					: [new KeyboardSensor(ctrl)]
		ctrl.onDrop((sourceId, _data, _containerId, position) => {
			const from = items.findIndex((i) => i.id === sourceId)
			if (from === -1) return
			const updated = [...items]
			const [moved] = updated.splice(from, 1)
			updated.splice(position, 0, moved)
			items = updated
		})
		return ctrl
	}

	let controller = $state(buildController('both'))

	$effect(() => {
		controller = buildController(activeMode)
	})
</script>

<div class="flex flex-col gap-4 max-w-sm">
	<div class="flex flex-wrap gap-2">
		{#each (['both', 'pointer-only', 'keyboard-only'] as const) as mode}
			<button
				class="black-button p-2 px-4"
				class:active={activeMode === mode}
				onclick={() => (activeMode = mode)}
			>
				{mode === 'both' ? 'Pointer + Keyboard' : mode === 'pointer-only' ? 'Pointer only' : 'Keyboard only'}
			</button>
		{/each}
	</div>

	{#if activeMode !== 'pointer-only'}
		<p class="text-sm text-neutral-500">Tab to focus, Enter/Space to pick up, arrow keys to move, Enter to drop</p>
	{/if}

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
