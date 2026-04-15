import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'

/**
 * Computes CSS translate offsets for draggable items during an active drag.
 * Item translations delegate to ContainerStrategy.getTranslations().
 *
 * Cross-container overflow is handled by dropTargetPadding: the target DndDroppable
 * adds margin-bottom/margin-right equal to the effective slot size, so the container
 * actually grows in layout flow and the browser naturally pushes subsequent siblings down.
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

	/**
	 * Extra margin to add to the cross-container drop target so it grows in layout flow,
	 * preventing translated items from visually overflowing into siblings below.
	 * Only set for cross-container drags; null otherwise.
	 */
	dropTargetPadding = $derived.by((): { containerId: string; x: number; y: number } | null => {
		if (!this.state.dragging || !this.state.session) return null

		const session = this.state.session
		const preview = session.dropPreview
		if (!preview?.visible) return null
		if (session.originContainerId === preview.containerId) return null

		let targetDroppable: Droppable | undefined
		for (const d of this.droppables.values()) {
			if (d.id === preview.containerId) { targetDroppable = d; break }
		}
		if (!targetDroppable) return null

		const slotSize = session.slotSize
		const direction = targetDroppable.direction
		const size = direction === 'horizontal' ? (slotSize?.width ?? 0) : (slotSize?.height ?? 0)
		const elementSize = direction === 'horizontal'
			? (preview.draggedElementWidth ?? 0)
			: (preview.draggedElementHeight ?? 0)
		const effectiveSize = size || elementSize
		if (effectiveSize === 0) return null

		return direction === 'horizontal'
			? { containerId: preview.containerId, x: effectiveSize, y: 0 }
			: { containerId: preview.containerId, x: 0, y: effectiveSize }
	})
}
