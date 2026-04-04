import { DndState } from './dnd-state.svelte.js'
import { ScrollController, type ScrollConfig } from '../scroll/scroll-controller.js'
import { type PreviewConfig } from '../handlers/preview-handler.svelte.js'
import { DOMHelper } from '../utils/dom-helper.js'
import { DndEventEmitter } from './dnd-event-emitter.js'
import { TranslationEngine } from '../zones/translation-engine.svelte.js'
import { ContainerRegistry } from '../containers/container-registry.js'
import { SortableContainerStrategy } from '../containers/strategies/sortable-container-strategy.js'
import { TargetContainerStrategy } from '../containers/strategies/target-container-strategy.js'
import type { ContainerStrategy } from '../containers/strategies/container-strategy.js'

export interface DndControllerConfig {
	scroll?: ScrollConfig
	preview?: PreviewConfig
	debug?: boolean
	strategies?: ContainerStrategy[]
}
import { DropResolver } from '../zones/drop-resolver.js'
import { AnimationPipeline } from '../animation/steps/animation-pipeline.js'
import { GhostToTargetStep } from '../animation/steps/ghost-to-target-step.js'
import { GhostReturnStep } from '../animation/steps/ghost-return-step.js'
import type { AnimationStep } from '../animation/steps/animation-step.js'
import { DndSimulator } from './dnd-simulator.js'
import type { DragSession } from './drag-session.js'
import type { DropZone, DndDirection, DndMode, DragStartCallback, DragEndCallback, DropCallback, DropCancelledCallback, ZonesInvalidatedCallback, DropPreview } from '../../types.js'

export type { DragStartCallback, DragEndCallback, DropCallback, DropCancelledCallback, ZonesInvalidatedCallback } from '../../types.js'

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
export class DndController {
	private state = new DndState()
	private registry = new ContainerRegistry()
	private strategyMap = new Map<string, ContainerStrategy>()
	private eventEmitter = new DndEventEmitter()
	private translationEngine = new TranslationEngine(this.state, this.registry)
	private dropResolver = new DropResolver(this.state, this.registry)
	private currentAnimation: AnimationPipeline | null = null
	private simulator!: DndSimulator
	private hidePreviewTimeout: ReturnType<typeof setTimeout> | null = null
	private scrollController: ScrollController
	previewShowDelay = 300
	previewCollapseDelay = 200
	debug = false

	constructor({ scroll = {}, preview = {}, debug = false, strategies = [] }: DndControllerConfig = {}) {
		this.debug = debug
		if (preview.showDelay !== undefined) this.previewShowDelay = preview.showDelay
		if (preview.collapseDelay !== undefined) this.previewCollapseDelay = preview.collapseDelay
		this.strategyMap.set('sortable', new SortableContainerStrategy(this.state))
		this.strategyMap.set('target', new TargetContainerStrategy(this.state))
		for (const strategy of strategies) {
			this.strategyMap.set(strategy.mode, strategy)
		}
		this.simulator = new DndSimulator(this.state, this.registry, this.strategyMap)
		this.scrollController = new ScrollController(this.state, {
			...scroll,
			onZoneRefresh: () => this.eventEmitter.notifyZonesInvalidated(),
			onMouseUpdate: (x, y) => this.updateMousePosition(x, y)
		})
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
	onDrop(cb: DropCallback)                         { return this.eventEmitter.onDrop(cb) }

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
		this.registry.registerData(id, data)
	}

	registerDroppableAccepts(id: string, accepts: string | string[] | undefined) {
		this.registry.registerAccepts(id, accepts)
	}

	unregisterDroppableData(id: string) {
		this.registry.unregisterContainer(id)
	}

	unregisterContainer(id: string) {
		this.registry.unregisterContainer(id)
		this.state.setDropZones(this.state.zones.filter((z) => z.containerId !== id))
	}

	startDrag(
		element: HTMLElement,
		itemId: string,
		initialPosition: { x: number; y: number },
		data?: Record<string, unknown>,
		type?: string
	) {
		const rect = element.getBoundingClientRect()

		let originContainerId = ''
		let originPosition = 0
		let slotSize: { width: number; height: number } | null = null

		const containerEl = element.closest<HTMLElement>('[data-dnd-drop-id]')
		if (containerEl) {
			const containerId = containerEl.getAttribute('data-dnd-drop-id')!
			const items = DOMHelper.findDraggableItemsInContainer(containerEl)
			const position = items.indexOf(element)
			originContainerId = containerId
			originPosition = position >= 0 ? position : 0
			slotSize = DOMHelper.calculateSlotSize(element, items)
		}

		const session: DragSession = {
			itemId,
			itemData: data,
			element,
			originContainerId,
			originPosition,
			startRect: rect,
			ghostTransform: initialPosition,
			dropPreview: null,
			ghostSize: { width: element.offsetWidth, height: element.offsetHeight },
			slotSize,
			draggedItemType: type ?? null,
			source: 'user'
		}

		this.state.startSession(session)
		this.state.setSkipDropPreviewAnimation(true)
		this.eventEmitter.notifyDragStart(itemId)
	}

	updateTransform(transform: { x: number; y: number }) {
		this.state.setTransform(transform)
	}

	updateMousePosition(mouseX: number, mouseY: number) {
		if (this.state.dragging) {
			const ghostCenter = this.getGhostCenter()
			this.updateDropPreview(ghostCenter)
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
	}

	performDrop(
		sourceId: string,
		sourceData: Record<string, unknown> | undefined,
		targetContainerId: string,
		position: number
	) {
		const targetZone = this.state.zones.find(
			(zone) => zone.containerId === targetContainerId && zone.position === position
		)

		this.state.setPerformingDrop(true)

		if (targetZone && this.state.element && this.state.transform) {
			this.animate(new GhostToTargetStep(this.state, targetZone), () => {
				this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
				this.finalizeDragEnd(sourceId)
			})
		} else {
			this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
			this.finalizeDragEnd(sourceId)
		}
	}

	/** Cancel the current drag and animate the ghost back to its origin. */
	endDrag(shouldAnimate = true) {
		const itemId = this.state.draggedItem
		const session = this.state.session

		if (itemId) this.eventEmitter.notifyDropCancelled(itemId)

		if (shouldAnimate && session?.originContainerId) {
			this.state.setDropPreview({
				containerId: session.originContainerId,
				position: session.originPosition,
				visible: true,
				draggedElementHeight: session.ghostSize.height,
				draggedElementWidth: session.ghostSize.width
			})
		}

		if (shouldAnimate && session) {
			requestAnimationFrame(() => {
				this.animate(
					new GhostReturnStep(this.state, this.state.originContainerId, this.state.originPosition),
					() => this.finalizeDragEnd(itemId)
				)
			})
		} else {
			this.finalizeDragEnd(itemId)
		}
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

	/** Update auto-scroll config at runtime. Changes take effect on the next scroll tick. */
	setScrollConfig(config: ScrollConfig) {
		this.scrollController.updateConfig(config)
	}

	/** Update preview animation delays at runtime. */
	setPreviewConfig(config: PreviewConfig) {
		if (config.showDelay !== undefined) this.previewShowDelay = config.showDelay
		if (config.collapseDelay !== undefined) this.previewCollapseDelay = config.collapseDelay
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
	simulateDrop(itemId: string, fromContainerId: string, toContainerId: string, toPosition: number): Promise<void> {
		return this.simulator.simulateDrop(itemId, fromContainerId, toContainerId, toPosition)
	}

	// --- Private ---

	private animate(step: AnimationStep, onComplete: () => void): void {
		this.currentAnimation?.cancel()
		const pipeline = AnimationPipeline.chain(step)
		this.currentAnimation = pipeline
		pipeline.execute().then(() => {
			this.currentAnimation = null
			onComplete()
		})
	}

	private getGhostCenter(): { x: number; y: number } {
		const transform = this.state.transform
		const size = this.state.elementSize
		if (transform && size) {
			return {
				x: transform.x + size.width / 2,
				y: transform.y + size.height / 2
			}
		}
		return this.state.transform ?? { x: 0, y: 0 }
	}

	private updateDropPreview(mousePos: { x: number; y: number }) {
		if (!this.state.dragging) {
			this.state.setDropPreview(null)
			return
		}

		const targetZone = this.dropResolver.findZoneAt(mousePos)

		if (targetZone) {
			const preview: DropPreview = {
				containerId: targetZone.containerId,
				position: targetZone.position,
				visible: true,
				draggedElementHeight: this.state.size?.height,
				draggedElementWidth: this.state.size?.width
			}
			this.state.setDropPreview(preview)

			if (this.state.skipDropPreviewAnimation) {
				requestAnimationFrame(() => {
					this.state.setSkipDropPreviewAnimation(false)
				})
			}
		} else {
			const current = this.state.dropPreview
			if (current?.visible) {
				this.state.setDropPreview({ ...current, visible: false })
				if (this.hidePreviewTimeout) clearTimeout(this.hidePreviewTimeout)
				this.hidePreviewTimeout = setTimeout(() => {
					this.hidePreviewTimeout = null
					if (this.state.dropPreview && !this.state.dropPreview.visible) {
						this.state.setDropPreview(null)
					}
				}, 300)
			}
		}
	}

	private finalizeDragEnd(itemId: string | null) {
		this.state.setSkipDropPreviewAnimation(true)
		this.scrollController.clearAll()
		this.state.reset()
		requestAnimationFrame(() => {
			this.state.setPerformingDrop(false)
		})

		if (itemId) {
			this.eventEmitter.notifyDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}

	/** Release all resources. Call when the `DndProvider` is destroyed. */
	destroy() {
		this.currentAnimation?.cancel()
		this.scrollController.destroy()
		this.registry.clearAll()
		this.eventEmitter.destroy()
	}
}
