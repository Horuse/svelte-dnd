<script lang="ts">
	import {
		DndProvider, DndDroppable, DndDraggable, DndController, sortable,
		autoScroll, scrollSync,
		type Behavior
	} from '@horuse/svelte-dnd'

	let items = $state(
		Array.from({ length: 30 }, (_, i) => ({ id: String(i), label: `Item ${i + 1}` }))
	)

	// 1. Drop sound — short sine-wave chirp via Web Audio API.
	let audioCtx: AudioContext | null = null
	const dropSound: Behavior = {
		name: 'dropSound',
		wrapDropAnimation(next) {
			return {
				execute() {
					audioCtx ??= new AudioContext()
					if (audioCtx.state === 'suspended') audioCtx.resume()
					const osc = audioCtx.createOscillator()
					const gain = audioCtx.createGain()
					osc.connect(gain).connect(audioCtx.destination)
					osc.type = 'sine'
					osc.frequency.value = 660
					gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
					gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15)
					osc.start()
					osc.stop(audioCtx.currentTime + 0.15)
					return next.execute()
				},
				cancel: () => next.cancel?.()
			}
		}
	}

	// 2. Slot ripple — flash the destination slot's background.
	const slotRipple: Behavior = {
		name: 'slotRipple',
		wrapDropAnimation(next, ctx) {
			return {
				execute() {
					ctx.targetEl?.animate(
						[
							{ backgroundColor: 'rgba(99, 102, 241, 0.35)', borderRadius: '12px' },
							{ backgroundColor: 'transparent', borderRadius: '12px' }
						],
						{ duration: 500, easing: 'ease-out' }
					)
					return next.execute()
				},
				cancel: () => next.cancel?.()
			}
		}
	}

	// 3. Emoji confetti — six 🎉 spans burst from the drop position and fade.
	const confettiBurst: Behavior = {
		name: 'confettiBurst',
		wrapDropAnimation(next, ctx) {
			return {
				execute() {
					if (ctx.targetEl) {
						const rect = ctx.targetEl.getBoundingClientRect()
						const cx = rect.left + rect.width / 2
						const cy = rect.top + rect.height / 2
						for (let i = 0; i < 6; i++) {
							const span = document.createElement('span')
							span.textContent = '🎉'
							span.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;font-size:22px;pointer-events:none;z-index:99999;transform:translate(-50%,-50%)`
							document.body.appendChild(span)
							const angle = (Math.PI * 2 * i) / 6 + (Math.random() - 0.5) * 0.6
							const dist = 60 + Math.random() * 50
							const tx = Math.cos(angle) * dist
							const ty = Math.sin(angle) * dist - 20
							const anim = span.animate(
								[
									{ transform: 'translate(-50%, -50%) scale(0.5)', opacity: 1 },
									{ transform: `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1.2)`, opacity: 0 }
								],
								{ duration: 700, easing: 'ease-out', fill: 'forwards' }
							)
							anim.onfinish = () => span.remove()
						}
					}
					return next.execute()
				},
				cancel: () => next.cancel?.()
			}
		}
	}

	// 4. Arrival bounce — pop the destination slot mid-flight.
	const arrivalBounce: Behavior = {
		name: 'arrivalBounce',
		wrapDropAnimation(next, ctx) {
			return {
				execute() {
					ctx.targetEl?.animate(
						[
							{ transform: 'scale(1)' },
							{ transform: 'scale(1.08)', offset: 0.5 },
							{ transform: 'scale(1)' }
						],
						{ duration: 400, easing: 'ease-out' }
					)
					return next.execute()
				},
				cancel: () => next.cancel?.()
			}
		}
	}

	// Side-effect behaviors go BEFORE scrollSync in the list. The first listed
	// wraps outer-most, so side effects fire before scrollSync gets to decide
	// whether to engage. When scrollSync engages it replaces the inner flight
	// entirely — putting the side effects after it would skip them on
	// off-screen drops.
	const controller = new DndController({
		behaviors: [autoScroll(), dropSound, slotRipple, confettiBurst, arrivalBounce, scrollSync()]
	})

	controller.onDrop(({ item: { id: sourceId }, target: { position } }) => {
		const fromIndex = items.findIndex((i) => i.id === sourceId)
		if (fromIndex === -1) return
		const updated = [...items]
		const [moved] = updated.splice(fromIndex, 1)
		updated.splice(position, 0, moved)
		items = updated
	})
</script>

<DndProvider {controller}>
	<DndDroppable
		spacing={12} class="flex flex-col h-96 overflow-y-auto max-w-sm p-3 bg-foreground border-2 border-second rounded-xl"
		id="list"
		strategy={sortable()}
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

<style>
	:root {
		--dnd-preview-bg: var(--color-third);
		--dnd-preview-border: 2px dashed var(--color-second-active);
		--dnd-preview-border-radius: 12px;
	}
</style>
