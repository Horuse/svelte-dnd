import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'

/**
 * Computes CSS translate offsets for each draggable item during an active drag.
 * Delegates to ContainerStrategy.getTranslations() for each registered droppable —
 * zero mode-specific logic lives here.
 */
export class TranslationEngine {
	constructor(
		private state: DndState,
		private droppables: Map<HTMLElement, Droppable>
	) {}

	translations = $derived.by((): Map<string, { x: number; y: number }> => {
		const map = new Map<string, { x: number; y: number }>()

		if (!this.state.dragging || !this.state.session) return map

		const session = this.state.session

		for (const droppable of this.droppables.values()) {
			const containerTranslations = droppable.strategy.getTranslations(droppable, session)
			for (const [itemId, offset] of containerTranslations) {
				map.set(itemId, offset)
			}
		}

		return map
	})
}
