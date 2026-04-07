import type { ContainerStrategy } from './strategies/container-strategy.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'

interface ContainerEntry {
	element: HTMLElement
	strategy: ContainerStrategy
}

export class ContainerRegistry {
	private containers = new Map<string, ContainerEntry>()
	private dataMap = new Map<string, Record<string, unknown>>()
	private acceptsMap = new Map<string, string | string[]>()
	private collisionMap = new Map<string, CollisionAlgorithm>()

	registerContainer(id: string, element: HTMLElement, strategy: ContainerStrategy): void {
		this.containers.set(id, { element, strategy })
	}

	unregisterContainer(id: string): void {
		this.containers.delete(id)
		this.dataMap.delete(id)
		this.acceptsMap.delete(id)
		this.collisionMap.delete(id)
	}

	clearAll(): void {
		this.containers.clear()
		this.dataMap.clear()
		this.acceptsMap.clear()
		this.collisionMap.clear()
	}

	registerData(id: string, data: Record<string, unknown>): void {
		this.dataMap.set(id, data)
	}

	registerAccepts(id: string, accepts: string | string[] | undefined): void {
		if (accepts !== undefined) this.acceptsMap.set(id, accepts)
		else this.acceptsMap.delete(id)
	}

	getStrategy(id: string): ContainerStrategy | undefined {
		return this.containers.get(id)?.strategy
	}

	getData(id: string): Record<string, unknown> | undefined {
		return this.dataMap.get(id)
	}

	getAccepts(id: string): string | string[] | undefined {
		return this.acceptsMap.get(id)
	}

	registerCollision(id: string, algo: CollisionAlgorithm | undefined): void {
		if (algo) this.collisionMap.set(id, algo)
		else this.collisionMap.delete(id)
	}

	getCollision(id: string): CollisionAlgorithm | undefined {
		return this.collisionMap.get(id)
	}

	getAllContainers(): Map<string, ContainerEntry> {
		return new Map(this.containers)
	}
}
