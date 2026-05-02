import { untrack } from 'svelte'
import type { Slot } from './slot.js'
import type { Droppable } from './droppable.svelte.js'
import type { DropPreview } from '../../types.js'

export interface PreviewConfig {
	/** Debounce delay (ms) before revealing the preview slot. Default: 300 */
	showDelay?: number
	/** Delay (ms) before collapsing the slot. Default: 200 */
	hideDelay?: number
}

// Minimal controller interface needed by Preview
export type PreviewControllerRef = {
	dropPreview: DropPreview | null
	dropPreviewSize: { width: number; height: number } | null
	ghostSize: { width: number; height: number } | null
	skipDropPreviewAnimation: boolean
	performingDrop: boolean
	translations: Map<string, { x: number; y: number }>
}

export interface PreviewInit {
	slot?: Slot
	droppable?: Droppable
	position: number
	config?: PreviewConfig
}

export class Preview {
	element!: HTMLElement
	slot = $state<Slot | undefined>(undefined)
	droppable = $state<Droppable | undefined>(undefined)
	position = $state(0)

	height = $state(0)
	width = $state(0)
	revealed = $state(false)
	instant = $state(false)

	showDelay: number
	hideDelay: number

	private controller: PreviewControllerRef
	private showTimer: ReturnType<typeof setTimeout> | null = null
	private collapseTimer: ReturnType<typeof setTimeout> | null = null

	constructor(controller: PreviewControllerRef, init: PreviewInit) {
		this.controller = controller
		this.slot = init.slot
		this.droppable = init.droppable
		this.position = init.position
		this.showDelay = init.config?.showDelay ?? 300
		this.hideDelay = init.config?.hideDelay ?? 200
	}

	get containerId(): string {
		return this.slot?.droppable?.id ?? this.droppable?.id ?? ''
	}

	get isHorizontal(): boolean {
		return this.slot?.droppable?.isHorizontal ?? this.droppable?.isHorizontal ?? false
	}

	get isVisible(): boolean {
		const dp = this.controller.dropPreview
		const cid = this.containerId
		if (!cid) return false
		return !!dp && dp.containerId === cid && dp.position === this.position
	}

	/**
	 * Which edge of the slot wrapper the preview anchors to.
	 * Computed from this slot's translate — a negative translate means the slot
	 * has moved backward, so the ghost lands at the far edge of the wrapper.
	 * Tail previews (no slot) always anchor to 'start'.
	 */
	get align(): 'start' | 'end' {
		const id = this.slot?.draggable?.id
		if (!id) return 'start'
		const translate = this.controller.translations.get(id) ?? { x: 0, y: 0 }
		const val = this.isHorizontal ? translate.x : translate.y
		return val < 0 ? 'end' : 'start'
	}

	show() {
		// Prefer the target's own item size so the preview matches what the
		// dropped item will actually be rendered as (covers cases where the
		// target shrinks items, e.g. a scrollbar appearing in the source/target).
		// Falls back to the dragged element's size when the target is empty.
		const previewSize = this.controller.dropPreviewSize
		const ghostSize = this.controller.ghostSize
		this.height = previewSize?.height ?? ghostSize?.height ?? 0
		this.width = previewSize?.width ?? ghostSize?.width ?? 0

		if (this.collapseTimer) { clearTimeout(this.collapseTimer); this.collapseTimer = null }

		const skip = untrack(() => this.controller.skipDropPreviewAnimation)
		if (skip) {
			if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null }
			this.revealed = true
			this.instant = true
			requestAnimationFrame(() => { this.instant = false })
		} else if (!this.showTimer) {
			this.showTimer = setTimeout(() => {
				this.revealed = true
				this.showTimer = null
			}, this.showDelay)
		}
	}

	hide(instant = false) {
		if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null }
		this.revealed = false

		if (instant) {
			if (this.collapseTimer) { clearTimeout(this.collapseTimer); this.collapseTimer = null }
			this.instant = true
			this.height = 0
			this.width = 0
			requestAnimationFrame(() => { this.instant = false })
		} else {
			this.instant = false
			this.collapseTimer = setTimeout(() => {
				this.height = 0
				this.width = 0
				this.collapseTimer = null
			}, this.hideDelay)
		}
	}

	destroy() {
		if (this.showTimer) clearTimeout(this.showTimer)
		if (this.collapseTimer) clearTimeout(this.collapseTimer)
	}

	/** @attach handler — sets element reference and links to slot or droppable (tail preview). */
	attach() {
		return (element: HTMLElement) => {
			this.element = element
			if (this.slot) this.slot.preview = this
			else if (this.droppable) this.droppable.tailPreview = this
			return () => {
				this.destroy()
				if (this.slot) this.slot.preview = undefined
				else if (this.droppable) this.droppable.tailPreview = undefined
			}
		}
	}
}
