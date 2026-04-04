import type { DndDirection, DndMode } from '../../types.js'
import type { DndController } from '../dnd/dnd-controller.svelte.js'

interface DroppableHandlerOptions {
	id: string
	data: Record<string, any>
	disabled: boolean
	direction: DndDirection
	mode: DndMode
	dndController: DndController | undefined
}

export class DropHandler {
	private scrollListeners: HTMLElement[] = []
	private scrollTimeout: ReturnType<typeof setTimeout> | null = null
	private unsubscribeDragStart: (() => void) | undefined
	private unsubscribeZonesInvalidated: (() => void) | undefined
	private unsubscribeDragEnd: (() => void) | undefined

	constructor(
		private getElement: () => HTMLElement | undefined,
		private getOptions: () => DroppableHandlerOptions
	) {
		const { dndController } = this.getOptions()

		this.unsubscribeDragStart = dndController?.onDragStart(() => {
			this.updateDropZones()
			this.setupScrollListeners()
		})

		this.unsubscribeZonesInvalidated = dndController?.onZonesInvalidated(() => {
			this.updateDropZones()
		})

		this.unsubscribeDragEnd = dndController?.onDragEnd(() => {
			this.cleanupScrollListeners()
		})
	}

	updateDropZones() {
		const element = this.getElement()
		const { id, disabled, direction, mode, dndController } = this.getOptions()
		if (!element || disabled || !dndController) return
		if (dndController.element?.contains(element)) return

		dndController.refreshContainerZones(id, element, direction, mode)
	}

	private handleScroll = () => {
		const { dndController } = this.getOptions()
		if (dndController?.dragging) {
			if (this.scrollTimeout) clearTimeout(this.scrollTimeout)
			this.scrollTimeout = setTimeout(() => {
				this.updateDropZones()
				this.scrollTimeout = null
			}, 10)
		}
	}

	private setupScrollListeners() {
		const element = this.getElement()
		let parent = element?.parentElement
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
		window.removeEventListener('scroll', this.handleScroll)
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
		const { id, dndController } = this.getOptions()
		dndController?.unregisterDroppableData(id)
	}
}
