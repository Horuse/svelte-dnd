<script lang="ts">
	import {
		DndController,
		DndProvider,
		DndDroppable,
		DndDraggable,
		PointerSensor,
		KeyboardSensor,
	} from '@horuse/svelte-dnd'

	type Mode = 'both' | 'pointer-only' | 'keyboard-only'
	let activeMode = $state<Mode>('both')

	let items = $state(
		Array.from({ length: 8 }, (_, i) => ({ id: `item-${i + 1}`, label: `Item ${i + 1}` }))
	)

	function handleDrop(ctrl: DndController) {
		ctrl.onDrop((sourceId, _data, _containerId, position) => {
			const from = items.findIndex((item) => item.id === sourceId)
			if (from === -1) return
			const updated = [...items]
			const [moved] = updated.splice(from, 1)
			updated.splice(position, 0, moved)
			items = updated
		})
	}

	function buildController(mode: Mode): DndController {
		// KeyboardSensor needs a reference to the controller to read filteredDropZones
		// during keyboard navigation. We create the controller first (with no sensors),
		// then construct sensors with the reference, and assign back via the public field.
		const ctrl = new DndController()
		const sensors =
			mode === 'both'
				? [new PointerSensor(), new KeyboardSensor(ctrl)]
				: mode === 'pointer-only'
					? [new PointerSensor()]
					: [new KeyboardSensor(ctrl)]
		// Overwrite the sensors field directly — the controller reads it lazily at drag-time
		ctrl.sensors = sensors
		handleDrop(ctrl)
		return ctrl
	}

	let controller = $state(buildController('both'))

	$effect(() => {
		controller = buildController(activeMode)
	})
</script>

<div class="example-wrapper">
	<div class="controls">
		<span class="label">Active sensors:</span>
		<div class="button-group">
			{#each (['both', 'pointer-only', 'keyboard-only'] as const) as mode}
				<button
					class="mode-btn"
					class:active={activeMode === mode}
					onclick={() => (activeMode = mode)}
				>
					{mode === 'both'
						? 'Pointer + Keyboard'
						: mode === 'pointer-only'
							? 'Pointer only'
							: 'Keyboard only'}
				</button>
			{/each}
		</div>
		{#if activeMode === 'keyboard-only'}
			<p class="hint">
				Focus an item with Tab, then press Enter or Space to pick it up. Use arrow keys to move,
				Enter to drop, Escape to cancel.
			</p>
		{:else if activeMode === 'both'}
			<p class="hint">Drag with mouse/touch or focus an item and press Enter/Space for keyboard drag.</p>
		{/if}
	</div>

	<DndProvider {controller}>
		<DndDroppable id="list" class="list">
			{#each items as item, index (item.id)}
				<DndDraggable id={item.id} position={index} class="item">
					<span class="handle">⠿</span>
					{item.label}
				</DndDraggable>
			{/each}
		</DndDroppable>
	</DndProvider>
</div>

<style>
	.example-wrapper {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-text-muted, #888);
	}

	.button-group {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.mode-btn {
		padding: 0.375rem 0.875rem;
		border-radius: 0.5rem;
		border: 2px solid transparent;
		background: var(--color-primary, #312e3b);
		color: var(--color-text, #fff);
		cursor: pointer;
		font-size: 0.875rem;
		transition:
			background 150ms,
			border-color 150ms;
	}

	.mode-btn:hover {
		background: var(--color-primary-hover, #3d3a47);
	}

	.mode-btn.active {
		border-color: var(--color-theme, #a78bfa);
		background: var(--color-primary-hover, #3d3a47);
	}

	.hint {
		font-size: 0.8125rem;
		color: var(--color-text-muted, #888);
		margin: 0;
		max-width: 36rem;
	}

	:global(.list) {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem;
		background: var(--color-primary, #312e3b);
		border-radius: 0.75rem;
		max-width: 20rem;
		--dnd-preview-bg: rgba(167, 139, 250, 0.15);
		--dnd-preview-border: 2px dashed rgba(167, 139, 250, 0.5);
	}

	:global(.item) {
		padding: 0.75rem 1rem;
		background: var(--color-foreground, #1e1b26);
		border-radius: 0.5rem;
		border: 1px solid rgba(255, 255, 255, 0.06);
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.9375rem;
	}

	.handle {
		color: var(--color-text-muted, #888);
		font-size: 1rem;
		line-height: 1;
	}
</style>
