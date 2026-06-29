import { SvelteMap } from 'svelte/reactivity'
import { DndState } from './dnd-state.svelte.js'
import { ScrollController } from '../scroll/scroll-controller.js'
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
import type { AnimateItemOptions, AnimateLayoutOptions } from './dnd-simulator.js'
import type {
	DragStartCallback,
	DragEndCallback,
	DropCallback,
	DragOverCallback,
	DropCancelledCallback,
	ZonesInvalidatedCallback,
	DndItemInfo,
	DndContainerInfo,
	DragStartEvent,
	Announcements,
	DndLayout
} from '../../types.js'
import type { AnimationConfig, ResolvedAnimationConfig } from '../animation/animation-config.js'
import { resolveAnimationConfig, DEFAULT_ANIMATION_CONFIG } from '../animation/animation-config.js'
import type { Behavior, AutoScrollConfig } from '../animation/behavior.js'
import { autoScroll } from '../animation/behaviors/auto-scroll.js'
import { scrollSync } from '../animation/behaviors/scroll-sync.js'
import { resolveBehaviors, findTargetSlotWrapper } from '../animation/apply-behaviors.js'
import { computePreviewSlotTarget } from '../animation/preview-slot-rect.js'
import { KeyboardFlight } from '../animation/keyboard-flight.js'
import { getDirectionAdapter } from '../animation/direction-adapter.js'
import { findScrollTarget } from '../scroll/scroll-into-view.js'
import { DragSession } from './drag-session.svelte.js'
import type { Draggable } from '../entities/draggable.svelte.js'
import type { Droppable } from '../entities/droppable.svelte.js'
import type { Slot } from '../entities/slot.js'

export interface DndControllerConfig {
	animation?: AnimationConfig
	/**
	 * Drop-side plugins. Default — `[autoScroll(), scrollSync()]`. Pass an
	 * explicit list (including empty `[]` to opt out of all defaults) to
	 * customise. Strategies can override per-droppable via their own
	 * `behaviors` option.
	 */
	behaviors?: Behavior[]
	debug?: boolean
	sensors?: SensorDescriptor[]
	collision?: CollisionAlgorithm
	modifiers?: Modifier[]
	announcements?: Announcements
}

export type {
	DragStartCallback,
	DragEndCallback,
	DropCallback,
	DragOverCallback,
	DropCancelledCallback,
	ZonesInvalidatedCallback
} from '../../types.js'

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
	private keyboardFlight: KeyboardFlight | null = null
	private lastPointer: { x: number; y: number } | null = null

	// --- Entity maps ---
	// Reactive maps so $derived computations (TranslationEngine, dropPreviewSize)
	// re-run when droppables mount/unmount mid-drag (lazy routes, virtualized parents).
	private droppables = new SvelteMap<HTMLElement, Droppable>()
	private droppablesById = new SvelteMap<string, Droppable>()
	/**
	 * Global element→Slot lookup used by sensors and attachSlot.
	 * @internal
	 */
	slots = new Map<HTMLElement, Slot>()
	/** Current drag session. Read-only — stored in DndState. */
	get session(): DragSession | null {
		return this.state.session
	}

	debug = $state(false)
	sensors = $state<SensorDescriptor[] | undefined>(undefined)
	announcements = $state<Announcements | undefined>(undefined)
	private defaultBehaviors: Behavior[] = []
	/**
	 * Reactive resolved animation config. DndPreview, DndProvider, DndDraggable
	 * and DndDroppable read live values from here for delays, durations and
	 * easings.
	 */
	animation = $state<ResolvedAnimationConfig>(DEFAULT_ANIMATION_CONFIG)

	constructor({
		animation,
		behaviors,
		debug = false,
		sensors,
		collision,
		modifiers = [],
		announcements
	}: DndControllerConfig = {}) {
		this.debug = debug
		this.sensors = sensors ?? [new PointerSensor(), new KeyboardSensor()]
		this.announcements = announcements
		this.modifiers = modifiers
		this.animation = resolveAnimationConfig(animation)
		this.defaultBehaviors = behaviors ?? [autoScroll(), scrollSync()]

		this.translationEngine = new TranslationEngine(this.state, this.droppables)
		this.dropResolver = new DropResolver(this.state, this.droppablesById, collision)

		this.scrollController = new ScrollController(this.state, {
			onZoneRefresh: () => this.eventEmitter.notifyZonesInvalidated(),
			onMouseUpdate: (x, y) => this.updateMousePosition(x, y),
			resolveAutoScrollConfig: (container) => this.resolveAutoScrollConfig(container),
			stopOnDrop: this.controllerAutoScrollConfig()?.stopOnDrop ?? false
		})

		this.animationCoordinator = new DropAnimationCoordinator(
			this.state,
			this.eventEmitter,
			this.scrollController,
			this.dropResolver,
			this.droppablesById,
			this.animation,
			this.defaultBehaviors
		)

		this.simulator = new DndSimulator(
			this.state,
			this.droppablesById,
			this.slots,
			this.eventEmitter,
			this.animation,
			this.defaultBehaviors
		)
	}

	/** First `autoScroll(...)` config among the controller's default behaviors. */
	private controllerAutoScrollConfig(): AutoScrollConfig | null {
		return this.defaultBehaviors.find((b) => b.autoScrollConfig)?.autoScrollConfig ?? null
	}

	/** Looks up the active auto-scroll config for any scrollable element ScrollController encounters. */
	private resolveAutoScrollConfig(container: HTMLElement): AutoScrollConfig | null {
		const dropId = container.getAttribute('data-dnd-drop-id')
		if (dropId) {
			const droppable = this.droppablesById.get(dropId)
			const behaviors = resolveBehaviors(droppable ?? null, this.defaultBehaviors)
			return behaviors.find((b) => b.autoScrollConfig)?.autoScrollConfig ?? null
		}
		// `data-dnd-scroll` (non-droppable wrappers) — controller defaults only.
		return this.controllerAutoScrollConfig()
	}

	// --- Reactive state (read-only) ---

	/**
	 * CSS translate offsets for each draggable item during an active drag. Keyed by item id.
	 * @internal
	 */
	get translations() {
		return this.translationEngine.translations
	}

	/**
	 * Extra margin for the cross-container drop target so it grows in layout flow,
	 * preventing translated items from visually overflowing into siblings.
	 * null when not in a cross-container drag.
	 * @internal
	 */
	get dropTargetPadding() {
		return this.translationEngine.dropTargetPadding
	}

	/** `true` while the user is dragging an item. */
	get dragging() {
		return this.state.dragging
	}

	/** The DOM element currently being dragged. */
	get element() {
		return this.state.element
	}

	/** @internal Alias of `element` used by `DroppableControllerRef` to disambiguate the dragged element from other DOM elements a consumer might track. */
	get draggedElement() {
		return this.state.element
	}

	/** Current `{ x, y }` transform of the ghost element. */
	get transform() {
		return this.state.transform
	}

	/** Id of the item being dragged. */
	get draggedItem() {
		return this.state.draggedItem
	}

	/** `type` field from the dragged item's data, used for accept filtering. */
	get draggedType() {
		return this.state.draggedType
	}

	/** Full data object of the dragged item. */
	get draggedItemData() {
		return this.state.draggedItemData
	}

	/** Width/height of the dragged element. */
	get ghostSize() {
		return this.state.ghostSize
	}

	/** `true` while the ghost is animating back to its origin. */
	get animatingReturn() {
		return this.state.animating
	}

	/** Current drop preview (target container + insertion position). */
	get dropPreview() {
		return this.state.dropPreview
	}

	// Cache for first-slot rects keyed by containerId. Avoids `getBoundingClientRect`
	// on every pointermove (the $derived below otherwise re-runs at 60fps and forces a
	// synchronous layout each tick). The slotId is stored alongside so we re-measure if
	// the first non-dragged slot identity changes (e.g. virtualizer remounts).
	// Cleared at session start so a stale rect from the previous drag never leaks in.
	private firstSlotRectCache = new Map<
		string,
		{ slotId: string; width: number; height: number }
	>()

	/**
	 * Reactive size for sizing ghost/preview to match the destination layout.
	 * Returns `null` when no drop preview is active, the target is empty, no
	 * first slot is mounted yet, or the target uses `target()` strategy (which
	 * doesn't constrain item size at all).
	 *
	 * Mixes target-sibling and dragged-item dimensions based on the target's
	 * layout — only the cross-axis is borrowed, because that's where target-side
	 * layout shrinkage shows up (e.g. a scrollbar narrowing items):
	 *
	 * - `vertical` sortable: width from target sibling, height from dragged.
	 * - `horizontal` sortable: height from target sibling, width from dragged.
	 * - `grid` sortable: both from target sibling (cells constrain both axes).
	 *
	 * For dimensions taken from the dragged item, falls back to the target
	 * sibling when `ghostSize` is missing (defensive — should always be set
	 * during an active preview).
	 */
	dropPreviewSize = $derived.by((): { width: number; height: number } | null => {
		const preview = this.state.dropPreview
		if (!preview) return null
		const droppable = this.droppablesById.get(preview.containerId)
		if (!droppable || droppable.mode !== 'sortable') return null

		const draggedId = this.state.draggedItem
		const firstSlot = droppable.getSortedSlots().find((s) => s.draggable?.id !== draggedId)
		if (!firstSlot?.draggable?.element) return null

		const slotId = firstSlot.draggable.id
		let cached = this.firstSlotRectCache.get(preview.containerId)
		if (!cached || cached.slotId !== slotId) {
			const r = firstSlot.draggable.element.getBoundingClientRect()
			cached = { slotId, width: r.width, height: r.height }
			this.firstSlotRectCache.set(preview.containerId, cached)
		}

		const ghost = this.state.ghostSize
		const ghostW = ghost?.width ?? cached.width
		const ghostH = ghost?.height ?? cached.height

		const layout = droppable.layout
		if (layout === 'horizontal') return { width: ghostW, height: cached.height }
		if (layout === 'grid') return { width: cached.width, height: cached.height }
		// vertical (default)
		return { width: cached.width, height: ghostH }
	})

	/** All registered drop zones across every `DndDroppable`. */
	get dropZones() {
		return this.state.zones
	}

	/** @internal */
	get debugZones() {
		return this.state.debugZones
	}

	/**
	 * Drop zones filtered to only those that accept the currently dragged item type.
	 * @internal
	 */
	get filteredDropZones() {
		return this.dropResolver.filteredZones
	}

	/** `true` while the drop animation is in progress. */
	get performingDrop() {
		return this.state.performingDrop
	}

	/** @internal */
	get skipDropPreviewAnimation() {
		return this.state.skipDropPreviewAnimation
	}

	/** `'user'` during real drag, `'programmatic'` during simulation. */
	get dragSource() {
		return this.state.dragSource
	}

	// --- Event subscriptions ---

	/** Fired when a drag begins. */
	onDragStart(cb: DragStartCallback) {
		return this.eventEmitter.onDragStart(cb)
	}

	/** Fired when a drag ends (drop or cancel). */
	onDragEnd(cb: DragEndCallback) {
		return this.eventEmitter.onDragEnd(cb)
	}

	/** Fired when a drag is cancelled (ghost returns to origin, no drop occurred). */
	onDropCancelled(cb: DropCancelledCallback) {
		return this.eventEmitter.onDropCancelled(cb)
	}

	/** Fired when an item is successfully dropped into a container. */
	onDrop(cb: DropCallback) {
		return this.eventEmitter.onDrop(cb)
	}

	/** Fired each time the drag-over target (container + position) changes. */
	onDragOver(cb: DragOverCallback) {
		return this.eventEmitter.onDragOver(cb)
	}

	/**
	 * Fired after auto-scroll moves a container, invalidating existing drop zone
	 * coordinates. Subscribe to recalculate zones if you manage them manually.
	 */
	onZonesInvalidated(cb: ZonesInvalidatedCallback) {
		return this.eventEmitter.onZonesInvalidated(cb)
	}

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
		this.lastPointer = { x: mouseX, y: mouseY }
		if (this.state.dragging && !this.state.performingDrop) {
			this.animationCoordinator.updateDropPreview({ x: mouseX, y: mouseY })
		}
	}

	/**
	 * Re-resolve the drop preview against the last known pointer position without
	 * a new pointer event. Used when zones shift under a stationary cursor, such
	 * as scrolling the container mid-drag.
	 */
	recomputeDropPreview() {
		if (!this.lastPointer) return
		if (this.state.dragging && !this.state.performingDrop) {
			this.animationCoordinator.updateDropPreview(this.lastPointer)
		}
	}

	handleAutoScroll(mouseX: number, mouseY: number) {
		if (this.state.dragging && !this.state.performingDrop) {
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
	}

	/** @internal */
	navigate(direction: NavigationDirection) {
		if (!this.state.dragging) return
		const session = this.state.session
		if (!session) return

		const current = this.state.dropPreview ?? {
			containerId: session.originContainerId,
			position: session.originPosition
		}
		const currentDroppable = this.droppablesById.get(current.containerId)
		if (!currentDroppable) return

		const target = this.isMainAxisDirection(currentDroppable.layout, direction)
			? this.navigateWithinContainer(currentDroppable, current.position, direction)
			: this.navigateAcrossContainers(currentDroppable, current.position, direction)

		if (target) this.applyKeyboardTarget(target)
	}

	private isMainAxisDirection(layout: DndLayout, direction: NavigationDirection): boolean {
		if (direction === 'home' || direction === 'end') return true
		if (layout === 'grid') return true
		if (layout === 'horizontal') return direction === 'left' || direction === 'right'
		return direction === 'up' || direction === 'down'
	}

	// Full position list for keyboard navigation — independent of viewport
	// (unlike `dropResolver.filteredZones`, which filters by viewport visibility
	// for pointer-collision purposes). Same-container: 0..itemCount-1, tail not
	// reachable. Cross-container: 0..itemCount inclusive (tail allowed).
	private validPositions(droppable: Droppable): number[] {
		const itemCount = droppable.itemCount
		const isSource = this.state.session?.originContainerId === droppable.id
		const max = isSource ? itemCount - 1 : itemCount
		const out: number[] = []
		for (let i = 0; i <= max; i++) out.push(i)
		return out
	}

	private slotOrTailRect(droppable: Droppable, position: number): DOMRect | null {
		const slotEl = droppable.getSlotAt(position)?.element
		if (slotEl) return slotEl.getBoundingClientRect()
		if (position === droppable.itemCount) {
			const tailEl = droppable.tailPreview?.element?.parentElement
			if (tailEl) return tailEl.getBoundingClientRect()
		}
		return null
	}

	private navigateWithinContainer(
		droppable: Droppable,
		currentPosition: number,
		direction: NavigationDirection
	): { containerId: string; position: number } | null {
		const positions = this.validPositions(droppable)
		if (positions.length === 0) return null

		if (direction === 'home') return { containerId: droppable.id, position: positions[0] }
		if (direction === 'end')
			return { containerId: droppable.id, position: positions[positions.length - 1] }

		const currentIdx = positions.indexOf(currentPosition)
		const safeIdx = currentIdx === -1 ? 0 : currentIdx

		if (droppable.layout === 'grid') {
			return this.navigateWithinGrid(droppable, positions, safeIdx, direction)
		}

		const isForward = direction === 'down' || direction === 'right'
		const next = positions[isForward ? safeIdx + 1 : safeIdx - 1]
		if (next === undefined) return null
		return { containerId: droppable.id, position: next }
	}

	private navigateWithinGrid(
		droppable: Droppable,
		positions: number[],
		currentIdx: number,
		direction: NavigationDirection
	): { containerId: string; position: number } | null {
		const currentPos = positions[currentIdx]
		const currentRect = this.slotOrTailRect(droppable, currentPos)

		if (!currentRect) {
			const isForward = direction === 'down' || direction === 'right'
			const next = positions[isForward ? currentIdx + 1 : currentIdx - 1]
			if (next === undefined) return null
			return { containerId: droppable.id, position: next }
		}

		const isHorizontal = direction === 'left' || direction === 'right'
		const isForward = direction === 'down' || direction === 'right'
		const bandHalf = isHorizontal ? currentRect.height / 2 : currentRect.width / 2
		const currentMain = isHorizontal
			? currentRect.left + currentRect.width / 2
			: currentRect.top + currentRect.height / 2
		const currentCross = isHorizontal
			? currentRect.top + currentRect.height / 2
			: currentRect.left + currentRect.width / 2

		let best: number | null = null
		let bestScore = Infinity
		for (const position of positions) {
			if (position === currentPos) continue
			const rect = this.slotOrTailRect(droppable, position)
			if (!rect) continue
			const main = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2
			const cross = isHorizontal ? rect.top + rect.height / 2 : rect.left + rect.width / 2
			const dMain = main - currentMain
			if (isForward ? dMain <= 0 : dMain >= 0) continue

			if (isHorizontal) {
				const sameLine = Math.abs(cross - currentCross) < bandHalf
				if (!sameLine) continue
				const score = Math.abs(dMain)
				if (score < bestScore) {
					bestScore = score
					best = position
				}
			} else {
				const score = Math.abs(dMain) * 2 + Math.abs(cross - currentCross)
				if (score < bestScore) {
					bestScore = score
					best = position
				}
			}
		}

		if (best === null) return null
		return { containerId: droppable.id, position: best }
	}

	private navigateAcrossContainers(
		currentDroppable: Droppable,
		currentPosition: number,
		direction: NavigationDirection
	): { containerId: string; position: number } | null {
		const isHorizontal = direction === 'left' || direction === 'right'
		const draggedType = this.state.draggedType ?? undefined

		const candidates: Array<{ droppable: Droppable; rect: DOMRect }> = []
		for (const droppable of this.droppablesById.values()) {
			if (droppable.disabled) continue
			if (droppable.mode !== 'sortable') continue
			if (!droppable.acceptsType(draggedType)) continue
			candidates.push({ droppable, rect: droppable.element.getBoundingClientRect() })
		}
		candidates.sort((a, b) =>
			isHorizontal ? a.rect.left - b.rect.left : a.rect.top - b.rect.top
		)

		const currentIdx = candidates.findIndex((c) => c.droppable.id === currentDroppable.id)
		if (currentIdx === -1) return null

		const isForward = direction === 'down' || direction === 'right'
		const next = candidates[isForward ? currentIdx + 1 : currentIdx - 1]
		if (!next) return null

		const nextPositions = this.validPositions(next.droppable)
		if (nextPositions.length === 0) return null

		const refRect = this.slotOrTailRect(currentDroppable, currentPosition)
		if (!refRect) return { containerId: next.droppable.id, position: nextPositions[0] }

		const refCoord = isHorizontal
			? refRect.top + refRect.height / 2
			: refRect.left + refRect.width / 2

		let best: number = nextPositions[0]
		let bestDist = Infinity
		for (const position of nextPositions) {
			const slotRect = this.slotOrTailRect(next.droppable, position)
			if (!slotRect) continue
			const center = isHorizontal
				? slotRect.top + slotRect.height / 2
				: slotRect.left + slotRect.width / 2
			const dist = Math.abs(center - refCoord)
			if (dist < bestDist) {
				bestDist = dist
				best = position
			}
		}

		return { containerId: next.droppable.id, position: best }
	}

	private applyKeyboardTarget(target: { containerId: string; position: number }) {
		const targetDroppable = this.droppablesById.get(target.containerId)
		if (!targetDroppable) return

		this.animationCoordinator.setActivePreview({
			containerId: target.containerId,
			position: target.position
		})

		// Defer one frame so reactive style updates (last-slot margin toggle on
		// tail activation, sibling translations) flush before we measure. Rapid
		// keypresses coalesce via the dropPreview match check.
		requestAnimationFrame(() => {
			if (!this.state.dragging) return
			const preview = this.state.dropPreview
			if (preview?.containerId !== target.containerId) return
			if (preview?.position !== target.position) return

			const slotEl = findTargetSlotWrapper(targetDroppable, target.position)
			const padding = targetDroppable.spacing ?? 0
			const flightCfg = this.animation.keyboardFlight
			const flight = this.getKeyboardFlight()
			const ghostSize = this.state.ghostSize

			// Target off-screen — animate scroll + ghost transform in lockstep.
			const scrollTarget = slotEl ? findScrollTarget(slotEl, padding) : null
			if (slotEl && scrollTarget) {
				this.runScrollSyncFlight(
					flight,
					flightCfg,
					targetDroppable,
					target.position,
					slotEl,
					scrollTarget.container,
					scrollTarget.direction,
					padding,
					ghostSize
				)
				return
			}

			// Target already visible — fly straight to its live slot rect.
			const ghostTarget = computePreviewSlotTarget(
				targetDroppable,
				target.position,
				ghostSize
			)
			if (ghostTarget) {
				flight.animateTo(ghostTarget, flightCfg)
				return
			}

			// Slot not mounted (e.g. virtualized) — fall back to zone rect.
			const fallback = this.state.zones.find(
				(z) => z.containerId === target.containerId && z.position === target.position
			)
			if (fallback) {
				flight.animateTo(
					{
						x: fallback.rect.x + (fallback.rect.width - (ghostSize?.width ?? 0)) / 2,
						y: fallback.rect.y
					},
					flightCfg
				)
			}
		})
	}

	// Scroll + ghost flight in lockstep. Anchors the GHOST rect (not the slot
	// wrapper) to the visible band — so ghost.top sits at visibleStart on Up
	// and ghost.bottom sits at visibleEnd on Down, independent of slot height.
	private runScrollSyncFlight(
		flight: KeyboardFlight,
		flightCfg: { duration: number; easing: string },
		droppable: Droppable,
		position: number,
		slotEl: HTMLElement,
		container: HTMLElement,
		direction: 'vertical' | 'horizontal',
		padding: number,
		ghostSize: { width: number; height: number } | null
	) {
		const adapter = getDirectionAdapter(direction)
		const ghostW = ghostSize?.width ?? 0
		const ghostH = ghostSize?.height ?? 0

		// Live wrapper rect → align-aware ghost rect in current viewport space.
		const previewRect = slotEl.getBoundingClientRect()
		const previewEntity = droppable.getSlotAt(position)?.preview ?? droppable.tailPreview
		const previewHorizontal = previewEntity?.isHorizontal ?? false
		const alignEnd = previewEntity?.align === 'end'
		const currentGhostX =
			alignEnd && previewHorizontal ? previewRect.right - ghostW : previewRect.left
		const currentGhostY =
			alignEnd && !previewHorizontal ? previewRect.bottom - ghostH : previewRect.top

		const containerRect = container.getBoundingClientRect()
		const startScroll = adapter.getScroll(container)

		let scrollDelta = 0
		let ghostFinalX = currentGhostX
		let ghostFinalY = currentGhostY

		if (direction === 'vertical') {
			const visibleTop = containerRect.top + padding
			const visibleBottom = containerRect.bottom - padding
			if (currentGhostY < visibleTop) {
				ghostFinalY = visibleTop
				scrollDelta = currentGhostY - visibleTop
			} else if (currentGhostY + ghostH > visibleBottom) {
				ghostFinalY = visibleBottom - ghostH
				scrollDelta = currentGhostY + ghostH - visibleBottom
			}
		} else {
			const visibleLeft = containerRect.left + padding
			const visibleRight = containerRect.right - padding
			if (currentGhostX < visibleLeft) {
				ghostFinalX = visibleLeft
				scrollDelta = currentGhostX - visibleLeft
			} else if (currentGhostX + ghostW > visibleRight) {
				ghostFinalX = visibleRight - ghostW
				scrollDelta = currentGhostX + ghostW - visibleRight
			}
		}

		if (scrollDelta === 0) {
			flight.animateTo({ x: currentGhostX, y: currentGhostY }, flightCfg)
			return
		}

		const targetScroll = startScroll + scrollDelta
		const startGhost = { ...(this.state.transform ?? { x: 0, y: 0 }) }
		const state = this.state

		flight.run(
			{
				duration: flightCfg.duration,
				update(eased) {
					adapter.setScroll(container, startScroll + scrollDelta * eased)
					state.setTransform({
						x: startGhost.x + (ghostFinalX - startGhost.x) * eased,
						y: startGhost.y + (ghostFinalY - startGhost.y) * eased
					})
				},
				finalize: () => {
					adapter.setScroll(container, targetScroll)
					// Snap to live align-aware target — corrects for any drift
					// from translation updates that landed during the flight.
					const snap = computePreviewSlotTarget(droppable, position, ghostSize)
					if (snap) state.setTransform(snap)
				}
			},
			flightCfg.easing
		)
	}

	private getKeyboardFlight(): KeyboardFlight {
		if (!this.keyboardFlight) this.keyboardFlight = new KeyboardFlight(this.state)
		return this.keyboardFlight
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
		this.keyboardFlight?.cancel()
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

	/**
	 * Replace the controller-level default `behaviors` at runtime. Per-strategy
	 * `behaviors` set on a `sortable()` / `target()` instance are unaffected.
	 * Changes take effect on the next scroll tick / next drop animation.
	 */
	setBehaviors(behaviors: Behavior[]) {
		this.defaultBehaviors = behaviors
		this.scrollController.updateOptions({
			stopOnDrop: this.controllerAutoScrollConfig()?.stopOnDrop ?? false
		})
		this.animationCoordinator.setDefaultBehaviors(behaviors)
		this.simulator.setDefaultBehaviors(behaviors)
	}

	/**
	 * Update animation config at runtime. Accepts a partial — provided fields
	 * override, omitted fields keep their current value. Changes propagate
	 * reactively to every live DndPreview, DndDraggable, DndDroppable, and to
	 * the next drop / return / FLIP animation.
	 */
	setAnimation(config: AnimationConfig = {}) {
		this.animation = resolveAnimationConfig(config, this.animation)
		this.animationCoordinator.setAnimationConfig(this.animation)
		this.simulator.setAnimationConfig(this.animation)
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

	/**
	 * Replace the active transform modifier pipeline at runtime. Pass an empty
	 * array to disable all modifiers.
	 */
	setModifiers(modifiers: Modifier[]) {
		this.modifiers = modifiers
	}

	/** Toggle visual overlay of drop zones — useful for debugging layout. */
	toggleDebugZones() {
		this.state.toggleDebugZones()
	}

	/** Delegates to {@link DndSimulator.animateItem}. */
	animateItem(itemId: string, options: AnimateItemOptions): Promise<void> {
		return this.simulator.animateItem(itemId, options)
	}

	/** Delegates to {@link DndSimulator.animateLayout}. */
	animateLayout(
		applyState: () => void | Promise<void>,
		options?: AnimateLayoutOptions
	): Promise<void> {
		return this.simulator.animateLayout(applyState, options)
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
			droppable.strategy.bindContext?.({
				state: this.state,
				droppablesById: this.droppablesById
			})
			this.droppables.set(element, droppable)
			this.droppablesById.set(droppable.id, droppable)
			droppable.setupEventListeners()

			return () => {
				this.droppables.delete(element)
				this.droppablesById.delete(droppable.id)
				droppable.destroy()
				this.state.setDropZones(
					this.state.zones.filter((z) => z.containerId !== droppable.id)
				)
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

		const newSession = new DragSession(
			draggable,
			sourceContainer,
			rect,
			initialTransform,
			'user'
		)

		// Give every strategy a chance to capture transform-free state before the
		// reactive cycle runs. Built-in sortable uses this to snapshot layout rects;
		// custom strategies can hook in the same way.
		for (const droppable of this.droppablesById.values()) {
			droppable.strategy.onSessionStart?.(droppable, newSession)
		}

		// Drop the per-session geometry cache so a fresh first-slot rect is taken on
		// the next dropPreviewSize read. Without this, a previous drag's measurement
		// would size the new session's preview/ghost.
		this.firstSlotRectCache.clear()

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
		this.endDrag(false)
	}

	/**
	 * Commit the current drag session — perform drop if a valid target exists,
	 * otherwise animate the ghost back to origin.
	 * @internal
	 */
	commitSession() {
		this.keyboardFlight?.cancel()
		const dropPreview = this.state.dropPreview
		const session = this.state.session
		const srcId = session?.source.id ?? this.state.draggedItem
		const srcData = session?.source.data ?? this.state.draggedItemData

		if (dropPreview && srcId) {
			this.state.setSkipDropPreviewAnimation(true)
			this.animationCoordinator.performDrop(
				srcId,
				srcData,
				dropPreview.containerId,
				dropPreview.position
			)
		} else {
			this.endDrag(true)
		}
	}

	/** Release all resources. Call when the `DndProvider` is destroyed. */
	destroy() {
		this.keyboardFlight?.cancel()
		this.animationCoordinator.destroy()
		this.scrollController.destroy()
		this.eventEmitter.destroy()
		// Drop any active session so a mid-drag teardown (e.g. route change) doesn't leave
		// the ghost element, translations, or drop preview lingering in the DOM.
		this.state.reset()
	}
}
