import { untrack } from 'svelte'
import type { DndController } from '../dnd/dnd-controller.svelte.js'

export interface PreviewConfig {
	/** Debounce delay (ms) before revealing the preview slot. Default: 300 */
	showDelay?: number
	/** Delay (ms) before collapsing the slot — should match --dnd-preview-duration-out. Default: 200 */
	collapseDelay?: number
}

export class PreviewHandler {
	height = $state(0)
	width = $state(0)
	revealed = $state(false)
	instant = $state(false)

	showDelay = 300
	collapseDelay = 200

	private showTimer: ReturnType<typeof setTimeout> | null = null
	private collapseTimer: ReturnType<typeof setTimeout> | null = null

	show(dndManager: DndController | undefined) {
		this.height = dndManager?.dropPreview?.draggedElementHeight ?? 0
		this.width = dndManager?.dropPreview?.draggedElementWidth ?? 0

		if (this.collapseTimer) { clearTimeout(this.collapseTimer); this.collapseTimer = null }

		const skip = untrack(() => dndManager?.skipDropPreviewAnimation)
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
}
