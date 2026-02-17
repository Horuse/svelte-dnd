import { getDirectionAdapter, type DirectionAdapter } from './direction-adapter.js'

// Animation timing constants
const ANIMATION_DURATION = {
	SCROLL_MIN: 400,
	SCROLL_MAX: 1500
} as const

const SCROLL_SPEED_PX_PER_SEC = 1800

interface ScrollTargetParams {
	placeholder: HTMLElement
	container: HTMLElement
	expectedSize: number
	direction: 'vertical' | 'horizontal'
}

interface ScrollTargetResult {
	targetScroll: number
	scrollDelta: number
}

interface FinalGhostPositionParams {
	placeholderRect: DOMRect
	scrollDelta: number
	direction: 'vertical' | 'horizontal'
}

export class ScrollSyncCalculator {
	calculateScrollTarget(params: ScrollTargetParams): ScrollTargetResult {
		const { placeholder, container, expectedSize, direction } = params
		const adapter = getDirectionAdapter(direction)

		const placeholderRect = placeholder.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()

		const startScroll = adapter.getScroll(container)
		const containerSize = adapter.getSize(containerRect)
		const containerStart = adapter.getPosition(containerRect)
		const containerEnd = containerStart + containerSize

		const placeholderSize = adapter.getSize(placeholderRect) || expectedSize
		const placeholderStart = adapter.getPosition(placeholderRect)
		const placeholderEnd = adapter.getEndPosition(placeholderRect, placeholderSize)

		let targetScroll = startScroll

		if (placeholderStart < containerStart) {
			// Placeholder вище/лівіше видимої області
			const overflow = containerStart - placeholderStart
			targetScroll = startScroll - overflow
		} else if (placeholderEnd > containerEnd) {
			// Placeholder нижче/правіше видимої області
			const overflow = placeholderEnd - containerEnd
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
		const { placeholderRect, scrollDelta, direction } = params

		if (direction === 'horizontal') {
			return {
				x: placeholderRect.left - scrollDelta,
				y: placeholderRect.top
			}
		} else {
			return {
				x: placeholderRect.left,
				y: placeholderRect.top - scrollDelta
			}
		}
	}
}
