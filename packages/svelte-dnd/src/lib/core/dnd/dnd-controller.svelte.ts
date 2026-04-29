import { DndState } from './dnd-state.svelte.js'
import { ScrollController, type ScrollConfig } from '../scroll/scroll-controller.js'
import type { PreviewConfig } from '../entities/preview.svelte.js'
import { DndEventEmitter } from './dnd-event-emitter.js'
import { TranslationEngine } from '../zones/translation-engine.svelte.js'
import type { SensorDescriptor, NavigationDirection } from '../sensors/sensor.js'
import { PointerSensor } from '../sensors/pointer-sensor.js'
import { KeyboardSensor } from '../sensors/keyboard-sensor.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import { DropResolver } from '../zones/drop-resolver.js'
import { DropAnimationCoordinator } from '../animation/drop-animation-coordinator.js'
import type { Modifier } from '../modifiers/modifier.js'
import { DndSimulator } from './dnd-simulator.js'
import type { DropZone, DragStartCallback, DragEndCallback, DropCallback, DragOverCallback, DropCancelledCallback, ZonesInvalidatedCallback, DndItemInfo, DndContainerInfo, DragStartEvent, Announcements } from '../../types.js'
import { DragSession } from './drag-session.svelte.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { Slot } from '../entities/slot.js'

export interface DndControllerConfig {
	scroll?: ScrollConfig
	preview?: PreviewConfig
	debug?: boolean
	sensors?: SensorDescriptor[]
	collision?: CollisionAlgorithm
	modifiers?: Modifier[]
	announcements?: Announcements
}

export type { DragStartCallback, DragEndCallback, DropCallback, DragOverCallback, DropCancelledCallback, ZonesInvalidatedCallback } from '../../types.js'

/**
 * Central controller for drag-and-drop. Create one instance and pass it to
 * `DndProvider` — all child `DndDroppable` and `DndDraggable` components will
 * share the same state.
 *
 * @example
 * ```ts
 * const controller = new DndController()
 *
 * controller.onDrop(({ item, source, target }) => {
 *   // reorder / move items in your data model
 * })
 * ```
 */
export class DndController {
	private state = new DndState()
	private eventEmitter = new DndEventEmitter()
	private translationEngine: TranslationEngine
	private dropResolver: DropResolver
	private scrollController: ScrollController
	private animationCoordinator: DropAnimationCoordinator
	private simulator: DndSimulator
	private modifiers: Modifier[]

	// --- Entity maps ---
	private droppables = new Map<HTMLElement, Droppable>()
	private droppablesById = new Map<string, Droppable>()
	/**
	 * Global element→Slot lookup used by sensors and attachSlot.
	 * @internal
	 */
	slots = new Map<HTMLElement, Slot>()
	/** Current drag session. Read-only — stored in DndState. */
	get session(): DragSession | null { return this.state.session }

	debug = $state(false)
	sensors = $state<SensorDescriptor[] | undefined>(undefined)
	announcements = $state<Announcements | undefined>(undefined)
	/**
	 * Reactive preview delays. DndPreview syncs its Preview entity from this.
	 * @internal
	 */
	previewConfig = $state<{ showDelay: number; collapseDelay: number }>({ showDelay: 300, collapseDelay: 200 })

	constructor({ scroll = {}, preview, debug = false, sensors, collision, modifiers = [], announcements }: DndControllerConfig = {}) {
		this.debug = debug
		this.sensors = sensors ?? [new PointerSensor(), new KeyboardSensor()]
		this.announcements = announcements
		this.modifiers = modifiers
		if (preview?.showDelay !== undefined) this.previewConfig.showDelay = preview.showDelay
		if (preview?.collapseDelay !== undefined) this.previewConfig.collapseDelay = preview.collapseDelay

		this.translationEngine = new TranslationEngine(this.state, this.droppables)
		this.dropResolver = new DropResolver(this.state, this.droppablesById, collision)

		this.scrollController = new ScrollController(this.state, {
			...scroll,
			onZoneRefresh: () => this.eventEmitter.notifyZonesInvalidated(),
			onMouseUpdate: (x, y) => this.updateMousePosition(x, y)
		})

		this.animationCoordinator = new DropAnimationCoordinator(
			this.state,
			this.eventEmitter,
			this.scrollController,
			this.dropResolver,
			this.droppablesById
		)

		this.simulator = new DndSimulator(this.state, this.droppablesById, this.slots, this.eventEmitter)
	}

	// --- Reactive state (read-only) ---

	/**
	 * CSS translate offsets for each draggable item during an active drag. Keyed by item id.
	 * @internal
	 */
	get translations() { return this.translationEngine.translations }

	/**
	 * Extra margin for the cross-container drop target so it grows in layout flow,
	 * preventing translated items from visually overflowing into siblings.
	 * null when not in a cross-container drag.
	 * @internal
	 */
	get dropTargetPadding() { return this.translationEngine.dropTargetPadding }

	/** `true` while the user is dragging an item. */
	get dragging() { return this.state.dragging }

	/** The DOM element currently being dragged. */
	get element() { return this.state.element }

	/** @internal Alias of `element` used by `DroppableControllerRef` to disambiguate the dragged element from other DOM elements a consumer might track. */
	get draggedElement() { return this.state.element }

	/** Current `{ x, y }` transform of the ghost element. */
	get transform() { return this.state.transform }

	/** Id of the item being dragged. */
	get draggedItem() { return this.state.draggedItem }

	/** `type` field from the dragged item's data, used for accept filtering. */
	get draggedType() { return this.state.draggedType }

	/** Full data object of the dragged item. */
	get draggedItemData() { return this.state.draggedItemData }

	/** Width/height of the dragged element. */
	get ghostSize() { return this.state.ghostSize }

	/** `true` while the ghost is animating back to its origin. */
	get animatingReturn() { return this.state.animating }

	/** Current drop preview (target container + insertion position). */
	get dropPreview() { return this.state.dropPreview }

	/** All registered drop zones across every `DndDroppable`. */
	get dropZones() { return this.state.zones }

	/** @internal */
	get debugZones() { return this.state.debugZones }

	/**
	 * Drop zones filtered to only those that accept the currently dragged item type.
	 * @internal
	 */
	get filteredDropZones() { return this.dropResolver.filteredZones }

	/** `true` while the drop animation is in progress. */
	get performingDrop() { return this.state.performingDrop }

	/** @internal */
	get skipDropPreviewAnimation() { return this.state.skipDropPreviewAnimation }

	/** `'user'` during real drag, `'programmatic'` during simulation. */
	get dragSource() { return this.state.dragSource }

	// --- Event subscriptions ---

	/** Fired when a drag begins. */
	onDragStart(cb: DragStartCallback)               { return this.eventEmitter.onDragStart(cb) }

	/** Fired when a drag ends (drop or cancel). */
	onDragEnd(cb: DragEndCallback)                   { return this.eventEmitter.onDragEnd(cb) }

	/** Fired when a drag is cancelled (ghost returns to origin, no drop occurred). */
	onDropCancelled(cb: DropCancelledCallback)        { return this.eventEmitter.onDropCancelled(cb) }

	/** Fired when an item is successfully dropped into a container. */
	onDrop(cb: DropCallback) {
		return this.eventEmitter.onDrop(cb)
	}

	/** Fired each time the drag-over target (container + position) changes. */
	onDragOver(cb: DragOverCallback)                 { return this.eventEmitter.onDragOver(cb) }

	/**
	 * Fired after auto-scroll moves a container, invalidating existing drop zone
	 * coordinates. Subscribe to recalculate zones if you manage them manually.
	 */
	onZonesInvalidated(cb: ZonesInvalidatedCallback) { return this.eventEmitter.onZonesInvalidated(cb) }

	// --- Lifecycle ---

	/** @internal */
	setSkipDropPreviewAnimation(value: boolean) {
		this.state.setSkipDropPreviewAnimation(value)
	}

	updateTransform(rawTransform: { x: number; y: number }) {
		if (this.modifiers.length === 0) {
			this.state.setTransform(rawTransform)
			return
		}

		const initialTransform = this.state.session?.ghostTransform ?? rawTransform
		const ghostSize = this.state.ghostSize ?? { width: 0, height: 0 }
		const originContainerId = this.state.session?.originContainerId ?? ''

		let transform = rawTransform
		for (const modifier of this.modifiers) {
			transform = modifier({ transform, initialTransform, ghostSize, originContainerId })
		}
		this.state.setTransform(transform)
	}

	updateMousePosition(mouseX: number, mouseY: number) {
		if (this.state.dragging && !this.state.performingDrop) {
			this.animationCoordinator.updateDropPreview({ x: mouseX, y: mouseY })
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
	}

	/** @internal */
	navigate(direction: NavigationDirection) {
		if (!this.state.dragging) return

		const filteredZones = this.dropResolver.filteredZones
		const containerZones = new Map<string, DropZone[]>()
		for (const zone of filteredZones) {
			if (!containerZones.has(zone.containerId)) containerZones.set(zone.containerId, [])
			containerZones.get(zone.containerId)!.push(zone)
		}
		for (const [, zones] of containerZones) zones.sort((a, b) => a.position - b.position)

		const containerIds = [...containerZones.keys()]
		const preview = this.state.dropPreview
		const ghostSize = this.state.ghostSize

		let targetZone: DropZone | null = null
		let targetZones: DropZone[] = []

		if (!preview) {
			const firstZones = containerZones.get(containerIds[0]) ?? []
			targetZone = firstZones[0] ?? null
			targetZones = firstZones
		} else {
			const currentZones = containerZones.get(preview.containerId) ?? []
			const currentIdx = currentZones.findIndex((z) => z.position === preview.position)
			const currentContainerIdx = containerIds.indexOf(preview.containerId)

			if (direction === 'down' || direction === 'right') {
				if (currentIdx < currentZones.length - 1) {
					targetZone = currentZones[currentIdx + 1]
					targetZones = currentZones
				} else if (direction === 'right' && currentContainerIdx < containerIds.length - 1) {
					const nextId = containerIds[currentContainerIdx + 1]
					targetZones = containerZones.get(nextId) ?? []
					targetZone = targetZones[0] ?? null
				}
			} else {
				if (currentIdx > 0) {
					targetZone = currentZones[currentIdx - 1]
					targetZones = currentZones
				} else if (direction === 'left' && currentContainerIdx > 0) {
					const prevId = containerIds[currentContainerIdx - 1]
					targetZones = containerZones.get(prevId) ?? []
					targetZone = targetZones[targetZones.length - 1] ?? null
				}
			}
		}

		if (!targetZone) return

		const zoneIdx = targetZones.findIndex((z) => z.position === targetZone!.position)
		const nextZone = targetZones[zoneIdx + 1]
		const centerX = targetZone.rect.x + targetZone.rect.width / 2
		const centerY = nextZone ? nextZone.rect.y : targetZone.rect.y
		const offsetX = ghostSize ? ghostSize.width / 2 : 0
		const offsetY = ghostSize ? ghostSize.height / 2 : 0

		const ghostTransform = { x: centerX - offsetX, y: centerY - offsetY }

		this.updateTransform(ghostTransform)
		this.state.setDropPreview({
			containerId: targetZone.containerId,
			position: targetZone.position
		})
	}

	performDrop(
		sourceId: string,
		sourceData: Record<string, unknown> | undefined,
		targetContainerId: string,
		position: number
	) {
		this.animationCoordinator.performDrop(sourceId, sourceData, targetContainerId, position)
	}

	/** Cancel the current drag and animate the ghost back to its origin. */
	endDrag(shouldAnimate = true) {
		this.animationCoordinator.endDrag(shouldAnimate)
	}

	/**
	 * Recalculate drop zones for a Droppable entity. Called by Droppable.invalidateZones().
	 * @internal
	 */
	refreshDroppableZones(droppable: Droppable) {
		const newZones = droppable.strategy.calculateDropZones(droppable, this.state.session)
		const otherZones = this.state.zones.filter((z) => z.containerId !== droppable.id)
		this.state.setDropZones([...otherZones, ...newZones])
	}

	/** Update auto-scroll config at runtime. Changes take effect on the next scroll tick. */
	setScrollConfig(config: ScrollConfig) {
		this.scrollController.updateConfig(config)
	}

	/**
	 * Update preview animation delays at runtime. Changes propagate reactively
	 * to every live DndPreview.
	 */
	setPreviewConfig(config: PreviewConfig) {
		if (config.showDelay !== undefined) this.previewConfig.showDelay = config.showDelay
		if (config.collapseDelay !== undefined) this.previewConfig.collapseDelay = config.collapseDelay
	}

	/** Toggle dev warnings (duplicate positions, etc.) at runtime. */
	setDebug(value: boolean) {
		this.debug = value
	}

	/**
	 * Replace the active sensors at runtime. Pass `undefined` to fall back to
	 * the default `[PointerSensor, KeyboardSensor]` set.
	 */
	setSensors(sensors: SensorDescriptor[] | undefined) {
		this.sensors = sensors ?? [new PointerSensor(), new KeyboardSensor()]
	}

	/**
	 * Replace the screen-reader announcement strings at runtime. Pass
	 * `undefined` to restore the defaults.
	 */
	setAnnouncements(announcements: Announcements | undefined) {
		this.announcements = announcements
	}

	/** Toggle visual overlay of drop zones — useful for debugging layout. */
	toggleDebugZones() {
		this.state.toggleDebugZones()
	}

	/** Delegates to {@link DndSimulator.simulateReturn}. */
	simulateReturn(itemId: string, fromContainerId: string, toContainerId: string, toPosition: number): Promise<void> {
		return this.simulator.simulateReturn(itemId, fromContainerId, toContainerId, toPosition)
	}

	/** Delegates to {@link DndSimulator.simulateDrop}. */
	simulateDrop(itemId: string, fromContainerId: string, toContainerId: string, toPosition: number, options?: import('../dnd/dnd-simulator.js').SimulateOptions): Promise<void> {
		return this.simulator.simulateDrop(itemId, fromContainerId, toContainerId, toPosition, options)
	}

	/** Delegates to {@link DndSimulator.simulateSwap}. */
	simulateSwap(idA: string, containerA: string, idB: string, containerB: string, duration?: number): Promise<void> {
		return this.simulator.simulateSwap(idA, containerA, idB, containerB, duration)
	}

	/** Delegates to {@link DndSimulator.simulateBatchSwap}. */
	simulateBatchSwap(ids: string[], applyState: () => void | Promise<void>, duration?: number): Promise<void> {
		return this.simulator.simulateBatchSwap(ids, applyState, duration)
	}

	// --- Entity-based API ---

	/**
	 * @attach handler for DndDroppable — registers a Droppable in the entity maps
	 * and binds its strategy to controller state on first attach.
	 * @internal
	 */
	attachDroppable(droppable: Droppable) {
		return (element: HTMLElement) => {
			droppable.element = element
			droppable.strategy.bindContext?.({ state: this.state, droppablesById: this.droppablesById })
			this.droppables.set(element, droppable)
			this.droppablesById.set(droppable.id, droppable)
			droppable.setupEventListeners()

			return () => {
				this.droppables.delete(element)
				this.droppablesById.delete(droppable.id)
				droppable.destroy()
				this.state.setDropZones(this.state.zones.filter((z) => z.containerId !== droppable.id))
			}
		}
	}

	/**
	 * Start a drag session from an entity-based Draggable.
	 * The same DragSession instance is shared with DndState.
	 * @internal
	 */
	startSession(draggable: Draggable, initialTransform: { x: number; y: number }): DragSession {
		const slot = draggable.slot
		const sourceContainer = slot.droppable
		const rect = draggable.element.getBoundingClientRect()

		const newSession = new DragSession(draggable, sourceContainer, rect, initialTransform, 'user')

		// Give every strategy a chance to capture transform-free state before the
		// reactive cycle runs. Built-in sortable uses this to snapshot layout rects;
		// custom strategies can hook in the same way.
		for (const droppable of this.droppablesById.values()) {
			droppable.strategy.onSessionStart?.(droppable, newSession)
		}

		this.state.startSession(newSession)
		this.state.setSkipDropPreviewAnimation(true)

		const itemInfo: DndItemInfo = {
			id: draggable.id,
			data: draggable.data,
			type: draggable.type,
			element: draggable.element
		}
		const sourceInfo: DndContainerInfo = sourceContainer.toContainerInfo(slot.position)
		const startEvent: DragStartEvent = { item: itemInfo, source: sourceInfo }
		this.eventEmitter.notifyDragStart(startEvent)

		return newSession
	}

	/**
	 * Cancel the current drag session (no drop, no return animation).
	 * @internal
	 */
	cancelSession() {
		this.animationCoordinator.endDrag(false)
	}

	/**
	 * Commit the current drag session — perform drop if a valid target exists,
	 * otherwise animate the ghost back to origin.
	 * @internal
	 */
	commitSession() {
		const dropPreview = this.state.dropPreview
		const session = this.state.session
		const srcId = session?.source.id ?? this.state.draggedItem
		const srcData = session?.source.data ?? this.state.draggedItemData

		if (dropPreview && srcId) {
			this.state.setSkipDropPreviewAnimation(true)
			this.animationCoordinator.performDrop(srcId, srcData, dropPreview.containerId, dropPreview.position)
		} else {
			this.animationCoordinator.endDrag(true)
		}
	}

	/** Release all resources. Call when the `DndProvider` is destroyed. */
	destroy() {
		this.animationCoordinator.destroy()
		this.scrollController.destroy()
		this.eventEmitter.destroy()
		// Drop any active session so a mid-drag teardown (e.g. route change) doesn't leave
		// the ghost element, translations, or drop preview lingering in the DOM.
		this.state.reset()
	}
}
