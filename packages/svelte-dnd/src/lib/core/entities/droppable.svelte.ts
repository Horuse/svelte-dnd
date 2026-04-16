import { SvelteMap } from 'svelte/reactivity'
import { isBrowser } from '../utils/dom-helper.js'
import type { DndDirection, DndMode } from '../../types.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import type { ContainerStrategy } from '../containers/strategies/container-strategy.js'
import type { Slot } from './slot.js'
import type { Preview } from './preview.svelte.js'
import type { DragSession } from '../dnd/drag-session.svelte.js'

// Minimal controller interface needed by Droppable
export type DroppableControllerRef = {
	session: DragSession | null
	element: HTMLElement | null
	cancelSession(): void
	slots: Map<HTMLElement, Slot>
	onDragStart(cb: (itemId: string) => void): () => void
	onZonesInvalidated(cb: () => void): () => void
	onDragEnd(cb: (itemId: string) => void): () => void
	refreshDroppableZones(droppable: Droppable): void
	dragging: boolean
}

interface DroppableConfig {
	id: string
	data?: Record<string, unknown>
	disabled?: boolean
	direction?: DndDirection
	mode?: DndMode
	collision?: CollisionAlgorithm
	accepts?: string | string[]
	strategy: ContainerStrategy
}

export class Droppable {
	element!: HTMLElement

	// Config
	id: string
	data: Record<string, unknown> | undefined
	disabled: boolean
	direction: DndDirection
	mode: DndMode
	collision: CollisionAlgorithm | undefined
	accepts: string | string[] | undefined
	spacing = $state<number | undefined>(undefined)
	strategy: ContainerStrategy

	slots = new SvelteMap<HTMLElement, Slot>()
	tailPreview: Preview | undefined = undefined

	private controller: DroppableControllerRef
	private scrollListeners: HTMLElement[] = []
	private scrollTimeout: ReturnType<typeof setTimeout> | null = null
	private unsubscribeDragStart: (() => void) | undefined
	private unsubscribeZonesInvalidated: (() => void) | undefined
	private unsubscribeDragEnd: (() => void) | undefined

	constructor(config: DroppableConfig, controller: DroppableControllerRef) {
		this.id = config.id
		this.data = config.data
		this.disabled = config.disabled ?? false
		this.direction = config.direction ?? 'vertical'
		this.mode = config.mode ?? 'sortable'
		this.collision = config.collision
		this.accepts = config.accepts
		this.spacing = undefined
		this.strategy = config.strategy
		this.controller = controller
	}

	get isHorizontal(): boolean {
		return this.direction === 'horizontal'
	}

	get isOver(): boolean {
		return this.controller.session?.dropPreview?.containerId === this.id
	}

	// --- Slot management ---

	/**
	 * @attach handler — registers a Slot with this droppable and the global controller slots map.
	 * Called via {@attach droppable.attachSlot(slot)} on the wrapper element in DndDraggable.
	 */
	attachSlot(slot: Slot) {
		return (element: HTMLElement) => {
			slot.element = element
			slot.droppable = this
			this.slots.set(element, slot)
			this.controller.slots.set(element, slot)

			return () => {
				if (this.controller.session?.source.slot === slot) {
					this.controller.cancelSession()
				}
				this.slots.delete(element)
				this.controller.slots.delete(element)
			}
		}
	}

	getSlotAt(position: number): Slot | undefined {
		for (const slot of this.slots.values()) {
			if (slot.position === position) return slot
		}
		return undefined
	}

	getSortedSlots(): Slot[] {
		return Array.from(this.slots.values()).sort((a, b) => a.position - b.position)
	}

	acceptsType(type: string | undefined): boolean {
		if (!this.accepts) return true
		if (!type) return true
		if (Array.isArray(this.accepts)) return this.accepts.includes(type)
		return this.accepts === type
	}

	getScrollOffset(): { x: number; y: number } {
		if (!this.element) return { x: 0, y: 0 }
		return { x: this.element.scrollLeft, y: this.element.scrollTop }
	}

	invalidateZones() {
		if (!this.element || this.disabled) return
		if (this.controller.element?.contains(this.element)) return
		this.controller.refreshDroppableZones(this)
	}

	// --- Lifecycle (set up from attachDroppable in controller) ---

	setupEventListeners() {
		this.unsubscribeDragStart = this.controller.onDragStart((_itemId) => {
			this.invalidateZones()
			this.setupScrollListeners()
		})

		this.unsubscribeZonesInvalidated = this.controller.onZonesInvalidated(() => {
			this.invalidateZones()
		})

		this.unsubscribeDragEnd = this.controller.onDragEnd((_itemId) => {
			this.cleanupScrollListeners()
		})
	}

	private handleScroll = () => {
		if (this.controller.dragging) {
			if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
			this.scrollTimeout = setTimeout(() => {
				this.invalidateZones()
				this.scrollTimeout = null
			}, 10)
		}
	}

	private setupScrollListeners() {
		if (!isBrowser) return
		let parent = this.element?.parentElement
		while (parent) {
			const style = window.getComputedStyle(parent)
			if (
				['auto', 'scroll', 'overlay'].includes(style.overflowY) ||
				['auto', 'scroll', 'overlay'].includes(style.overflowX)
			) {
				parent.addEventListener('scroll', this.handleScroll, { passive: true })
				this.scrollListeners.push(parent)
			}
			parent = parent.parentElement
		}
		window.addEventListener('scroll', this.handleScroll, { passive: true })
	}

	private cleanupScrollListeners() {
		this.scrollListeners.forEach((el) => el.removeEventListener('scroll', this.handleScroll))
		if (isBrowser) window.removeEventListener('scroll', this.handleScroll)
		this.scrollListeners = []
		if (this.scrollTimeout) {
			clearTimeout(this.scrollTimeout)
			this.scrollTimeout = null
		}
	}

	destroy() {
		this.cleanupScrollListeners()
		this.unsubscribeDragStart?.()
		this.unsubscribeZonesInvalidated?.()
		this.unsubscribeDragEnd?.()
	}
}
