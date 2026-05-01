import type { Behavior, AutoScrollConfig } from '../behavior.js'

/**
 * Edge-triggered auto-scroll while a drag is in progress.
 *
 * Built-in default — present in the controller's behavior list out of the box,
 * so opting out means passing an explicit `behaviors` array without this entry.
 *
 * @example
 * ```ts
 * // Controller-level (also applies to non-droppable `data-dnd-scroll` wrappers)
 * new DndController({
 *     behaviors: [autoScroll({ zoneRatio: 0.2, maxSpeed: 20 })]
 * })
 *
 * // Per-strategy override
 * sortable({
 *     layout: 'vertical',
 *     behaviors: [autoScroll({ maxSpeed: 60 })]
 * })
 * ```
 */
export function autoScroll(opts: AutoScrollConfig = {}): Behavior {
	return {
		name: 'autoScroll',
		autoScrollConfig: opts
	}
}
