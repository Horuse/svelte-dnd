import { slide, scale } from 'svelte/transition'
import type { DragController } from '../core/drag-controller.svelte.js'

export function createConditionalSlide(dndManager: DragController) {
	return function conditionalSlide(node: HTMLElement, options: any) {
		if (dndManager?.skipDropPreviewAnimation) {
			return { duration: 0 }
		}
		if (dndManager?.animatingReturn) {
			return slide(node, { ...options, duration: 200 })
		}
		return slide(node, options)
	}
}

export function createConditionalScale(dndManager: DragController) {
	return function conditionalScale(node: HTMLElement, options: any) {
		if (dndManager?.skipDropPreviewAnimation) {
			return { duration: 0 }
		}
		if (dndManager?.animatingReturn) {
			return scale(node, { ...options, duration: 100 })
		}
		return scale(node, options)
	}
}
