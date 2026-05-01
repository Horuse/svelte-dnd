import { getDirectionAdapter, type DirectionAdapter } from './direction-adapter.js'

// Animation timing constants
const ANIMATION_DURATION = {
	SCROLL_MIN: 400,
	SCROLL_MAX: 1500
} as const

const SCROLL_SPEED_PX_PER_SEC = 1800

interface ScrollTargetParams {
	preview: HTMLElement
	container: HTMLElement
	expectedSize: number
	direction: 'vertical' | 'horizontal'
	/** Extra space (px) to keep between the preview and the container edge after scrolling. Defaults to 0. */
	padding?: number
}

interface ScrollTargetResult {
	targetScroll: number
	scrollDelta: number
}

interface FinalGhostPositionParams {
	previewRect: DOMRect
	scrollDelta: number
	direction: 'vertical' | 'horizontal'
}

export class ScrollSyncCalculator {
	calculateScrollTarget(params: ScrollTargetParams): ScrollTargetResult {
		const { preview, container, expectedSize, direction, padding = 0 } = params
		const adapter = getDirectionAdapter(direction)

		const previewRect = preview.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()

		const startScroll = adapter.getScroll(container)
		const containerSize = adapter.getSize(containerRect)
		const containerStart = adapter.getPosition(containerRect)
		const containerEnd = containerStart + containerSize

		const previewSize = adapter.getSize(previewRect) || expectedSize
		const previewStart = adapter.getPosition(previewRect)
		const previewEnd = adapter.getEndPosition(previewRect, previewSize)

		// Inset the visible band by `padding` so the preview lands with a gap
		// from the container edge — same value droppable.spacing leaves between items.
		const visibleStart = containerStart + padding
		const visibleEnd = containerEnd - padding

		let targetScroll = startScroll

		if (previewStart < visibleStart) {
			// Preview is above/left of the visible band
			const overflow = visibleStart - previewStart
			targetScroll = startScroll - overflow
		} else if (previewEnd > visibleEnd) {
			// Preview is below/right of the visible band
			const overflow = previewEnd - visibleEnd
			targetScroll = startScroll + overflow
		}

		const finalScroll = Math.max(0, targetScroll)

		return {
			targetScroll: finalScroll,
			scrollDelta: finalScroll - startScroll
		}
	}

	calculateAdaptiveDuration(scrollDistance: number): number {
		const idealDuration = (scrollDistance / SCROLL_SPEED_PX_PER_SEC) * 1000
		return Math.max(
			ANIMATION_DURATION.SCROLL_MIN,
			Math.min(ANIMATION_DURATION.SCROLL_MAX, idealDuration)
		)
	}

	calculateFinalGhostPosition(params: FinalGhostPositionParams): { x: number; y: number } {
		const { previewRect, scrollDelta, direction } = params

		if (direction === 'horizontal') {
			return {
				x: previewRect.left - scrollDelta,
				y: previewRect.top
			}
		} else {
			return {
				x: previewRect.left,
				y: previewRect.top - scrollDelta
			}
		}
	}
}
