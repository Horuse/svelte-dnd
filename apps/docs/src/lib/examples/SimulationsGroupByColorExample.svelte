<script lang="ts">
	import { DndProvider, DndDroppable, DndDraggable, DndController } from '@horuse/svelte-dnd'

	type Color = 'blue' | 'green' | 'red'

	interface Task {
		id: string
		label: string
		color: Color
	}

	const allTasks: Task[] = [
		{ id: 'b1', label: 'Deploy API', color: 'blue' },
		{ id: 'b2', label: 'Write tests', color: 'blue' },
		{ id: 'b3', label: 'Code review', color: 'blue' },
		{ id: 'g1', label: 'Update docs', color: 'green' },
		{ id: 'g2', label: 'Fix typos', color: 'green' },
		{ id: 'g3', label: 'Add examples', color: 'green' },
		{ id: 'r1', label: 'Design mockup', color: 'red' },
		{ id: 'r2', label: 'User research', color: 'red' },
		{ id: 'r3', label: 'Update icons', color: 'red' },
	]

	const containerColors: Color[] = ['blue', 'green', 'red']

	type Containers = Record<Color, Task[]>

	function shuffle<T>(arr: T[]): T[] {
		const a = [...arr]
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1))
			;[a[i], a[j]] = [a[j], a[i]]
		}
		return a
	}

	function makeShuffled(): Containers {
		const shuffled = shuffle(allTasks)
		return {
			blue: shuffled.slice(0, 3),
			green: shuffled.slice(3, 6),
			red: shuffled.slice(6, 9),
		}
	}

	let containers = $state<Containers>(makeShuffled())
	let busy = $state(false)

	const controller = new DndController()

	controller.onDrop((sourceId, _data, toContainerId, position) => {
		const color = toContainerId as Color
		let task: Task | undefined
		for (const c of containerColors) {
			const idx = containers[c].findIndex((i) => i.id === sourceId)
			if (idx !== -1) {
				task = containers[c][idx]
				containers[c] = containers[c].filter((i) => i.id !== sourceId)
				break
			}
		}
		if (!task) return
		const updated = [...containers[color]]
		updated.splice(position, 0, task)
		containers[color] = updated
	})

	async function groupByColor() {
		if (busy) return
		busy = true
		const grouped: Containers = { blue: [], green: [], red: [] }
		for (const c of containerColors) {
			for (const task of containers[c]) {
				grouped[task.color].push(task)
			}
		}
		const ids = containerColors.flatMap((c) => containers[c].map((i) => i.id))
		await controller.simulateBatchSwap(ids, () => {
			containers = grouped
		})
		busy = false
	}

	async function doShuffle() {
		if (busy) return
		busy = true
		const shuffled = makeShuffled()
		const ids = containerColors.flatMap((c) => containers[c].map((i) => i.id))
		await controller.simulateBatchSwap(ids, () => {
			containers = shuffled
		})
		busy = false
	}

	const colorStyles: Record<Color, { border: string; dot: string }> = {
		blue: { border: 'border-blue-400', dot: 'bg-blue-400' },
		green: { border: 'border-green-400', dot: 'bg-green-400' },
		red: { border: 'border-red-400', dot: 'bg-red-400' },
	}

	const labelMap: Record<Color, string> = {
		blue: 'Backend',
		green: 'Docs',
		red: 'Design',
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex gap-3">
		<button class="black-button p-2 px-4" onclick={groupByColor} disabled={busy}>
			Group by color
		</button>
		<button class="black-button p-2 px-4" onclick={doShuffle} disabled={busy}>
			Shuffle
		</button>
	</div>

	<DndProvider {controller}>
		<div class="flex gap-4">
			{#each containerColors as color (color)}
				<div class="flex flex-col items-center gap-2">
					<div class="flex items-center gap-2">
						<span class="w-2.5 h-2.5 rounded-full {colorStyles[color].dot}"></span>
						<span class="text-sm text-neutral-500 font-semibold">{labelMap[color]}</span>
					</div>
					<DndDroppable
						class="flex flex-col space-y-2 w-48 min-h-40 p-3 bg-foreground border-2 {colorStyles[color].border} rounded-xl"
						id={color}
						direction="vertical"
					>
						{#each containers[color] as task, index (task.id)}
							<DndDraggable id={task.id} position={index}>
								<div class="drag-item flex items-center gap-2">
									<span class="w-2 h-2 rounded-full shrink-0 {colorStyles[task.color].dot}"></span>
									<span class="text-sm font-medium">{task.label}</span>
								</div>
							</DndDraggable>
						{/each}
					</DndDroppable>
				</div>
			{/each}
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
