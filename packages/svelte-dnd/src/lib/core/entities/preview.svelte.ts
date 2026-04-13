import { untrack } from 'svelte'
import type { Slot } from './slot.js'

export interface PreviewConfig {
	/** Debounce delay (ms) before revealing the preview slot. Default: 300 */
	showDelay?: number
	/** Delay (ms) before collapsing the slot — should match --dnd-preview-duration-out. Default: 200 */
	collapseDelay?: number
}

// Minimal controller interface needed by Preview
export type PreviewControllerRef = {
	session: { source: import('./draggable.svelte.js').Draggable; currentTarget: import('./droppable.svelte.js').Droppable | null; previewPosition: number | null } | null
	skipDropPreviewAnimation: boolean
	performingDrop: boolean
	dropPreview: import('../../types.js').DropPreview | null
}

export class Preview {
	element!: HTMLElement
	slot!: Slot

	// State (was in PreviewHandler)
	height = $state(0)
	width = $state(0)
	revealed = $state(false)
	instant = $state(false)

	// Config delays
	showDelay: number
	collapseDelay: number

	private controller: PreviewControllerRef
	private showTimer: ReturnType<typeof setTimeout> | null = null
	private collapseTimer: ReturnType<typeof setTimeout> | null = null

	constructor(controller: PreviewControllerRef, config?: PreviewConfig) {
		this.controller = controller
		this.showDelay = config?.showDelay ?? 300
		this.collapseDelay = config?.collapseDelay ?? 200
	}

	get isVisible(): boolean {
		const session = this.controller.session
		if (!session?.currentTarget || session.previewPosition === null) return false
		return (
			session.currentTarget === this.slot.droppable &&
			session.previewPosition === this.slot.position
		)
	}

	/**
	 * Whether the preview should align to the bottom edge of the slot.
	 * Used by GhostToTargetStep and for CSS class application.
	 * Computed from the ghost transform direction relative to slot position.
	 */
	get isAlignBottom(): boolean {
		const session = this.controller.session
		if (!session) return false
		const transform = session.source.translate
		return !this.slot.droppable.isHorizontal && transform.y < 0
	}

	get isAlignRight(): boolean {
		const session = this.controller.session
		if (!session) return false
		const transform = session.source.translate
		return this.slot.droppable.isHorizontal && transform.x < 0
	}

	show(skipAnimation: boolean) {
		this.height = this.controller.dropPreview?.draggedElementHeight ?? 0
		this.width = this.controller.dropPreview?.draggedElementWidth ?? 0

		if (this.collapseTimer) { clearTimeout(this.collapseTimer); this.collapseTimer = null }

		const skip = untrack(() => skipAnimation)
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
			}, this.collapseDelay)
		}
	}

	destroy() {
		if (this.showTimer) clearTimeout(this.showTimer)
		if (this.collapseTimer) clearTimeout(this.collapseTimer)
	}

	/** @attach handler — sets element reference on the Preview instance */
	attach() {
		return (element: HTMLElement) => {
			this.element = element
			this.slot.preview = this
			return () => {
				this.destroy()
				this.slot.preview = undefined
			}
		}
	}
}
