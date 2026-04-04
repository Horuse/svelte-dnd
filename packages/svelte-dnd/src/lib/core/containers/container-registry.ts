import type { ContainerStrategy } from './strategies/container-strategy.js'

interface ContainerEntry {
	element: HTMLElement
	strategy: ContainerStrategy
}

export class ContainerRegistry {
	private containers = new Map<string, ContainerEntry>()
	private dataMap = new Map<string, Record<string, any>>()
	private acceptsMap = new Map<string, string | string[]>()

	registerContainer(id: string, element: HTMLElement, strategy: ContainerStrategy): void {
		this.containers.set(id, { element, strategy })
	}

	unregisterContainer(id: string): void {
		this.containers.delete(id)
		this.dataMap.delete(id)
		this.acceptsMap.delete(id)
	}

	clearAll(): void {
		this.dataMap.clear()
		this.acceptsMap.clear()
	}

	registerData(id: string, data: Record<string, any>): void {
		this.dataMap.set(id, data)
	}

	registerAccepts(id: string, accepts: string | string[] | undefined): void {
		if (accepts !== undefined) this.acceptsMap.set(id, accepts)
		else this.acceptsMap.delete(id)
	}

	getStrategy(id: string): ContainerStrategy | undefined {
		return this.containers.get(id)?.strategy
	}

	getData(id: string): Record<string, any> | undefined {
		return this.dataMap.get(id)
	}

	getAccepts(id: string): string | string[] | undefined {
		return this.acceptsMap.get(id)
	}

	getAllContainers(): Map<string, ContainerEntry> {
		return new Map(this.containers)
	}
}
