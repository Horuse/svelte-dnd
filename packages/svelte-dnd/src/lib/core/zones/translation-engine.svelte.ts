import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { ContainerRegistry } from '../containers/container-registry.js'

/**
 * Computes CSS translate offsets for each draggable item during an active drag.
 * Delegates to ContainerStrategy.getTranslations() for each registered container —
 * zero mode-specific logic lives here.
 */
export class TranslationEngine {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry
	) {}

	translations = $derived.by((): Map<string, { x: number; y: number }> => {
		const map = new Map<string, { x: number; y: number }>()

		if (!this.state.dragging || !this.state.session) return map

		const session = this.state.session

		for (const [containerId, { element, strategy }] of this.registry.getAllContainers()) {
			const containerTranslations = strategy.getTranslations(containerId, element, session)
			for (const [itemId, offset] of containerTranslations) {
				map.set(itemId, offset)
			}
		}

		return map
	})
}
