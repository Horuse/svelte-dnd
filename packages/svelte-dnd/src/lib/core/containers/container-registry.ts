import type { ContainerStrategy } from './strategies/container-strategy.js'

interface ContainerEntry {
	element: HTMLElement
	strategy: ContainerStrategy
}

export class ContainerRegistry {
	private containers = new Map<string, ContainerEntry>()
	readonly dataMap = new Map<string, Record<string, any>>()

	registerContainer(id: string, element: HTMLElement, strategy: ContainerStrategy): void {
		this.containers.set(id, { element, strategy })
	}

	unregisterContainer(id: string): void {
		this.containers.delete(id)
		this.dataMap.delete(id)
	}

	registerData(id: string, data: Record<string, any>): void {
		this.dataMap.set(id, data)
	}

	getStrategy(id: string): ContainerStrategy | undefined {
		return this.containers.get(id)?.strategy
	}

	getData(id: string): Record<string, any> | undefined {
		return this.dataMap.get(id)
	}

	getAllContainers(): Map<string, ContainerEntry> {
		return this.containers
	}
}
