import { untrack } from 'svelte'
import type { DndController } from '../dnd/dnd-controller.svelte.js'

export class PreviewHandler {
	height = $state(0)
	width = $state(0)
	revealed = $state(false)
	instant = $state(false)

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
			}, 300)
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
			}, 200)
		}
	}

	destroy() {
		if (this.showTimer) clearTimeout(this.showTimer)
		if (this.collapseTimer) clearTimeout(this.collapseTimer)
	}
}
