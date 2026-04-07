import type { DndState } from './dnd-state.svelte.js'
import type { ContainerRegistry } from '../containers/container-registry.js'
import type { DndEventEmitter } from './dnd-event-emitter.js'
import type { ScrollController } from '../scroll/scroll-controller.js'
import type { DropAnimationCoordinator } from '../animation/drop-animation-coordinator.js'
import type { DragSession } from './drag-session.js'
import { DOMHelper } from '../utils/dom-helper.js'

export class DragSessionManager {
	constructor(
		private state: DndState,
		private registry: ContainerRegistry,
		private eventEmitter: DndEventEmitter,
		private scrollController: ScrollController,
		private animationCoordinator: DropAnimationCoordinator
	) {}

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
			this.animationCoordinator.updateDropPreview(ghostCenter)
			this.scrollController.handleAutoScroll(mouseX, mouseY)
		}
	}

	// --- Private ---

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
}
