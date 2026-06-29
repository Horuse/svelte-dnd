import { SvelteMap } from 'svelte/reactivity'
import { isBrowser } from '../utils/dom-helper.js'
import type {
	DndContainerInfo,
	DndLayout,
	DndMode,
	DragStartCallback,
	DragEndCallback
} from '../../types.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import type { ContainerStrategy } from '../containers/strategies/container-strategy.js'
import type { Slot } from './slot.js'
import type { Preview } from './preview.svelte.js'
import type { DragSession } from '../dnd/drag-session.svelte.js'

// Minimal controller interface needed by Droppable
export type DroppableControllerRef = {
	session: DragSession | null
	/** DOM element of the item currently being dragged (not the ghost). */
	draggedElement: HTMLElement | null
	cancelSession(): void
	slots: Map<HTMLElement, Slot>
	onDragStart(cb: DragStartCallback): () => void
	onZonesInvalidated(cb: () => void): () => void
	onDragEnd(cb: DragEndCallback): () => void
	refreshDroppableZones(droppable: Droppable): void
	recomputeDropPreview(): void
	dragging: boolean
}

interface DroppableConfig {
	id: string
	data?: Record<string, unknown>
	disabled?: boolean
	collision?: CollisionAlgorithm
	accepts?: string | string[]
	strategy: ContainerStrategy
}

export class Droppable {
	element!: HTMLElement

	id: string
	data: Record<string, unknown> | undefined
	disabled: boolean
	collision: CollisionAlgorithm | undefined
	accepts: string | string[] | undefined
	strategy: ContainerStrategy

	spacing = $state<number | undefined>(undefined)
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
		this.collision = config.collision
		this.accepts = config.accepts
		this.strategy = config.strategy
		this.controller = controller
	}

	get mode(): DndMode {
		return this.strategy.mode
	}

	get layout(): DndLayout {
		return this.strategy.layout ?? 'vertical'
	}

	get isHorizontal(): boolean {
		return this.layout === 'horizontal'
	}

	/**
	 * Number of items the container holds in its public list (the array users
	 * splice into on drop). For DOM-rendered lists this is `slots.size`; for
	 * virtualized strategies it comes from the strategy's virtual source so
	 * "last slot" / "tail position" math reflects the full data length, not the
	 * mounted window.
	 */
	get itemCount(): number {
		const virt = (this.strategy as { virtual?: { itemCount?: () => number } }).virtual
		const reported = virt?.itemCount?.()
		if (typeof reported === 'number' && reported >= 0) return reported
		return this.slots.size
	}

	/**
	 * Whether this container delegates its scroll viewport to a virtualizer
	 * (virtua, tanstack/virtual, …) rather than scrolling its own element.
	 * The drop coordinator uses this to skip its DOM scroll save/restore for
	 * virtualized droppables — those manage their own scroll-jump compensation
	 * and an extra write fights it.
	 */
	get isVirtualized(): boolean {
		return !!(this.strategy as { virtual?: unknown }).virtual
	}

	/** Build a public-facing snapshot for event callbacks. */
	toContainerInfo(position: number): DndContainerInfo {
		return {
			id: this.id,
			data: this.data,
			layout: this.layout,
			mode: this.mode,
			disabled: this.disabled,
			accepts: this.accepts,
			position
		}
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
		// Skip if this droppable is nested inside the currently dragged element —
		// the zone moves with the ghost, so its stored rect is still correct relative to the cursor.
		if (this.controller.draggedElement?.contains(this.element)) return
		this.controller.refreshDroppableZones(this)
	}

	// --- Lifecycle (set up from attachDroppable in controller) ---

	setupEventListeners() {
		this.unsubscribeDragStart = this.controller.onDragStart(() => {
			this.invalidateZones()
			this.setupScrollListeners()
		})

		this.unsubscribeZonesInvalidated = this.controller.onZonesInvalidated(() => {
			this.invalidateZones()
		})

		this.unsubscribeDragEnd = this.controller.onDragEnd(() => {
			this.cleanupScrollListeners()
		})
	}

	private handleScroll = () => {
		if (this.controller.dragging) {
			if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
			this.scrollTimeout = setTimeout(() => {
				this.invalidateZones()
				this.controller.recomputeDropPreview()
				this.scrollTimeout = null
			}, 10)
		}
	}

	private setupScrollListeners() {
		if (!isBrowser) return
		let parent: HTMLElement | null | undefined = this.element
		while (parent) {
			const style = window.getComputedStyle(parent)
			if (
				['auto', 'scroll', 'overlay'].includes(style.overflowY) ||
				['auto', 'scroll', 'overlay'].includes(style.overflowX)
			) {
				this.addScrollListener(parent)
			}
			parent = parent.parentElement
		}
		// Virtualizers delegate scrolling to a nested `data-dnd-scroll` viewport;
		// scroll events don't bubble, so listen on it directly.
		this.element
			?.querySelectorAll<HTMLElement>('[data-dnd-scroll]')
			.forEach((el) => this.addScrollListener(el))
		window.addEventListener('scroll', this.handleScroll, { passive: true })
	}

	private addScrollListener(el: HTMLElement) {
		if (this.scrollListeners.includes(el)) return
		el.addEventListener('scroll', this.handleScroll, { passive: true })
		this.scrollListeners.push(el)
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
