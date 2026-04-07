import { DndState } from './dnd-state.svelte.js'
import { ScrollController, type ScrollConfig } from '../scroll/scroll-controller.js'
import { type PreviewConfig } from '../handlers/preview-handler.svelte.js'
import { DndEventEmitter } from './dnd-event-emitter.js'
import { TranslationEngine } from '../zones/translation-engine.svelte.js'
import { ContainerRegistry } from '../containers/container-registry.js'
import { ContainerRegistrar } from '../containers/container-registrar.js'
import { SortableContainerStrategy } from '../containers/strategies/sortable-container-strategy.js'
import { TargetContainerStrategy } from '../containers/strategies/target-container-strategy.js'
import type { ContainerStrategy } from '../containers/strategies/container-strategy.js'
import type { SensorDescriptor } from '../sensors/sensor.js'
import { PointerSensor } from '../sensors/pointer-sensor.js'
import { KeyboardSensor } from '../sensors/keyboard-sensor.js'
import type { CollisionAlgorithm } from '../collision/collision-algorithm.js'
import { DropResolver } from '../zones/drop-resolver.js'
import { DropAnimationCoordinator } from '../animation/drop-animation-coordinator.js'
import { DragSessionManager } from './drag-session-manager.js'
import type { Modifier } from '../modifiers/modifier.js'
import { DndSimulator } from './dnd-simulator.js'
import type { DropZone, DndDirection, DndMode, DragStartCallback, DragEndCallback, DropCallback, DragOverCallback, DropCancelledCallback, ZonesInvalidatedCallback } from '../../types.js'

export type StrategyFactory = (state: DndState) => ContainerStrategy

export interface DndControllerConfig {
	scroll?: ScrollConfig
	preview?: PreviewConfig
	debug?: boolean
	strategies?: (ContainerStrategy | StrategyFactory)[]
	sensors?: SensorDescriptor[]
	collision?: CollisionAlgorithm
	modifiers?: Modifier[]
	announcements?: import('../../types.js').Announcements
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
 * controller.onDrop((sourceId, sourceData, targetContainerId, position) => {
 *   // reorder / move items in your data model
 * })
 * ```
 */
export class DndController<TData = Record<string, unknown>> {
	private state = new DndState()
	private registry = new ContainerRegistry()
	private strategyMap = new Map<string, ContainerStrategy>()
	private eventEmitter = new DndEventEmitter()
	private translationEngine: TranslationEngine
	private dropResolver: DropResolver
	private scrollController: ScrollController
	private animationCoordinator: DropAnimationCoordinator
	private sessionManager: DragSessionManager
	private registrar: ContainerRegistrar
	private simulator: DndSimulator

	debug = false
	sensors: SensorDescriptor[] | undefined = undefined
	announcements: import('../../types.js').Announcements | undefined = undefined

	constructor({ scroll = {}, preview = {}, debug = false, strategies = [], sensors, collision, modifiers = [], announcements }: DndControllerConfig = {}) {
		this.debug = debug
		this.sensors = sensors ?? [new PointerSensor(), new KeyboardSensor(this)]
		this.announcements = announcements

		this.strategyMap.set('sortable', new SortableContainerStrategy(this.state))
		this.strategyMap.set('target', new TargetContainerStrategy(this.state))
		for (const entry of strategies) {
			const strategy = typeof entry === 'function' ? entry(this.state) : entry
			this.strategyMap.set(strategy.mode, strategy)
		}

		this.translationEngine = new TranslationEngine(this.state, this.registry)
		this.dropResolver = new DropResolver(this.state, this.registry, collision)

		this.scrollController = new ScrollController(this.state, {
			...scroll,
			onZoneRefresh: () => this.eventEmitter.notifyZonesInvalidated(),
			onMouseUpdate: (x, y) => this.sessionManager.updateMousePosition(x, y)
		})

		this.animationCoordinator = new DropAnimationCoordinator(
			this.state,
			this.eventEmitter,
			this.scrollController,
			this.dropResolver
		)

		if (preview.showDelay !== undefined) this.animationCoordinator.previewShowDelay = preview.showDelay
		if (preview.collapseDelay !== undefined) this.animationCoordinator.previewCollapseDelay = preview.collapseDelay

		this.sessionManager = new DragSessionManager(
			this.state,
			this.registry,
			this.eventEmitter,
			this.scrollController,
			this.animationCoordinator,
			modifiers
		)

		this.registrar = new ContainerRegistrar(this.state, this.registry, this.strategyMap, debug)
		this.simulator = new DndSimulator(this.state, this.registry, this.strategyMap, this.eventEmitter)
	}

	// --- Reactive state (read-only) ---

	/** CSS translate offsets for each draggable item during an active drag. Keyed by item id. */
	get translations() { return this.translationEngine.translations }

	/** `true` while the user is dragging an item. */
	get dragging() { return this.state.dragging }

	/** The DOM element currently being dragged. */
	get element() { return this.state.element }

	/** Current `{ x, y }` transform of the ghost element. */
	get transform() { return this.state.transform }

	/** Id of the item being dragged. */
	get draggedItem() { return this.state.draggedItem }

	/** `type` field from the dragged item's data, used for accept filtering. */
	get draggedType() { return this.state.draggedType }

	/** Full data object of the dragged item. */
	get draggedItemData() { return this.state.draggedItemData }

	/** Width/height of the dragged element. */
	get size() { return this.state.size }

	/** `true` while the ghost is animating back to its origin. */
	get animatingReturn() { return this.state.animating }

	/** Current drop preview (target container + insertion position). */
	get dropPreview() { return this.state.dropPreview }

	/** All registered drop zones across every `DndDroppable`. */
	get dropZones() { return this.state.zones }

	get debugZones() { return this.state.debugZones }

	/** Drop zones filtered to only those that accept the currently dragged item type. */
	get filteredDropZones() { return this.dropResolver.filteredZones }

	/** `true` while the drop animation is in progress. */
	get performingDrop() { return this.state.performingDrop }

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

	/**
	 * Fired when an item is successfully dropped into a container.
	 *
	 * @param cb `(sourceId, sourceData, targetContainerId, position) => void`
	 */
	onDrop(cb: DropCallback<TData>) {
		return this.eventEmitter.onDrop((id, data, containerId, pos) =>
			cb(id, data as TData | undefined, containerId, pos)
		)
	}

	/** Fired each time the drag-over target (container + position) changes. */
	onDragOver(cb: DragOverCallback)                 { return this.eventEmitter.onDragOver(cb) }

	/**
	 * Fired after auto-scroll moves a container, invalidating existing drop zone
	 * coordinates. Subscribe to recalculate zones if you manage them manually.
	 */
	onZonesInvalidated(cb: ZonesInvalidatedCallback) { return this.eventEmitter.onZonesInvalidated(cb) }

	// --- Lifecycle (called by DndDraggable / DndDroppable internally) ---

	setSkipDropPreviewAnimation(value: boolean) {
		this.state.setSkipDropPreviewAnimation(value)
	}

	registerDroppableData(id: string, data: Record<string, unknown>) {
		this.registrar.registerDroppableData(id, data)
	}

	registerDroppableAccepts(id: string, accepts: string | string[] | undefined) {
		this.registrar.registerDroppableAccepts(id, accepts)
	}

	registerDroppableCollision(id: string, algo: CollisionAlgorithm | undefined) {
		this.registrar.registerDroppableCollision(id, algo)
	}

	unregisterDroppableData(id: string) {
		this.registrar.unregisterDroppableData(id)
	}

	unregisterContainer(id: string) {
		this.registrar.unregisterContainer(id)
	}

	startDrag(
		element: HTMLElement,
		itemId: string,
		initialPosition: { x: number; y: number },
		data?: Record<string, unknown>,
		type?: string
	) {
		this.sessionManager.startDrag(element, itemId, initialPosition, data, type)
	}

	updateTransform(transform: { x: number; y: number }) {
		this.sessionManager.updateTransform(transform)
	}

	updateMousePosition(mouseX: number, mouseY: number) {
		this.sessionManager.updateMousePosition(mouseX, mouseY)
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
	 * Register a container's drop zones and strategy.
	 * Called by DropHandler on drag start and scroll.
	 */
	refreshContainerZones(
		containerId: string,
		containerElement: HTMLElement,
		direction: DndDirection = 'vertical',
		mode: DndMode = 'sortable'
	) {
		this.registrar.refreshContainerZones(containerId, containerElement, direction, mode)
	}

	/** Update auto-scroll config at runtime. Changes take effect on the next scroll tick. */
	setScrollConfig(config: ScrollConfig) {
		this.scrollController.updateConfig(config)
	}

	/** Update preview animation delays at runtime. */
	setPreviewConfig(config: PreviewConfig) {
		this.animationCoordinator.setPreviewConfig(config)
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

	/** Release all resources. Call when the `DndProvider` is destroyed. */
	destroy() {
		this.animationCoordinator.destroy()
		this.scrollController.destroy()
		this.registry.clearAll()
		this.eventEmitter.destroy()
	}
}
