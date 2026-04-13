import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { ContainerRegistry } from './container-registry.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'

export class ContainerRegistrar {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry
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
}
