import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { ContainerRegistry } from './container-registry.js'
import type { ContainerStrategy } from './strategies/container-strategy.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import type { DndDirection, DndMode } from '../../types.js'

export class ContainerRegistrar {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry,
		private strategyMap: Map<string, ContainerStrategy>,
		private debug: boolean
	) {}

	registerDroppableData(id: string, data: Record<string, unknown>) {
		this.registry.registerData(id, data)
	}

	registerDroppableAccepts(id: string, accepts: string | string[] | undefined) {
		this.registry.registerAccepts(id, accepts)
	}

	registerDroppableCollision(id: string, algo: CollisionAlgorithm | undefined) {
		this.registry.registerCollision(id, algo)
	}

	unregisterDroppableData(id: string) {
		this.registry.unregisterContainer(id)
	}

	unregisterContainer(id: string) {
		this.registry.unregisterContainer(id)
		this.state.setDropZones(this.state.zones.filter((z) => z.containerId !== id))
	}

	refreshContainerZones(
		containerId: string,
		containerElement: HTMLElement,
		direction: DndDirection = 'vertical',
		mode: DndMode = 'sortable'
	) {
		const strategy = this.strategyMap.get(mode) ?? (
			this.debug && !['sortable', 'target'].includes(mode) &&
				console.warn(`[svelte-dnd] Unknown mode "${mode}", falling back to "sortable". Did you forget to register a strategy?`),
			this.strategyMap.get('sortable')!
		)

		this.registry.registerContainer(containerId, containerElement, strategy)

		const newZones = strategy.calculateDropZones(containerId, containerElement, this.state.session)
		const otherZones = this.state.zones.filter((z) => z.containerId !== containerId)
		this.state.setDropZones([...otherZones, ...newZones])
	}
}
