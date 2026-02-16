import type { DragState } from './drag-state.svelte.js'
import type { DropZone } from '../types.js'

// Animation timing constants
const ANIMATION_DURATION = {
	RETURN: 300,
	DROP: 250,
	SCROLL_MIN: 400,
	SCROLL_MAX: 1500
} as const

const SCROLL_SPEED_PX_PER_SEC = 1800

// DOM selectors
const SELECTORS = {
	container: (id: string) => `[data-drop-id="${id}"]`,
	placeholder: (position: number) => `[data-dnd-preview-position="${position}"]`
} as const

// Easing functions
const easing = {
	outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
	outQuad: (t: number) => 1 - Math.pow(1 - t, 2)
} as const

interface AnimationState {
	startTime: number
	duration: number
	startPos: { x: number; y: number }
	targetPos: { x: number; y: number }
}

export class AnimationController {
	constructor(private state: DragState) {}

	animateReturn(onComplete?: () => void) {
		if (!this.canAnimate()) {
			onComplete?.()
			return
		}

		const { originContainerId, originPosition } = this.getOriginInfo()
		if (!originContainerId) {
			this.startReturnAnimation(onComplete)
			return
		}

		this.handlePlaceholderBasedReturn(originContainerId, originPosition, onComplete)
	}

	animateToTarget(targetZone: DropZone, onComplete?: () => void) {
		if (!this.state.element || !this.state.transform) {
			onComplete?.()
			return
		}

		const animState: AnimationState = {
			startTime: Date.now(),
			duration: ANIMATION_DURATION.DROP,
			startPos: { ...this.state.transform },
			targetPos: this.calculatePlaceholderPosition(targetZone)
		}

		this.runAnimation(animState, easing.outQuad, onComplete)
	}

	// Core animation helpers

	private canAnimate(): boolean {
		return !!(this.state.element && this.state.transform && this.state.originalPosition)
	}

	private getOriginInfo() {
		return {
			originContainerId: this.state.originContainerId,
			originPosition: this.state.originPosition
		}
	}

	private handlePlaceholderBasedReturn(
		containerId: string,
		position: number,
		onComplete?: () => void
	) {
		const container = this.findContainer(containerId)
		if (!container) {
			this.startReturnAnimation(onComplete)
			return
		}

		const placeholder = this.findPlaceholder(container, position)
		if (placeholder) {
			this.handleFoundPlaceholder(container, placeholder, onComplete)
		} else {
			this.retryPlaceholderSearch(container, position, onComplete)
		}
	}

	private handleFoundPlaceholder(
		container: HTMLElement,
		placeholder: HTMLElement,
		onComplete?: () => void
	) {
		if (this.isElementVisibleInContainer(placeholder, container)) {
			this.startReturnAnimation(onComplete)
		} else {
			this.startSynchronizedScrollAnimation(container, placeholder, onComplete)
		}
	}

	private retryPlaceholderSearch(
		container: HTMLElement,
		position: number,
		onComplete?: () => void
	) {
		// Placeholder might not be rendered yet, retry next frame
		requestAnimationFrame(() => {
			const placeholder = this.findPlaceholder(container, position)
			if (placeholder) {
				this.handleFoundPlaceholder(container, placeholder, onComplete)
			} else {
				this.startReturnAnimation(onComplete)
			}
		})
	}

	// DOM queries

	private findContainer(containerId: string): HTMLElement | null {
		return document.querySelector(SELECTORS.container(containerId))
	}

	private findPlaceholder(container: HTMLElement, position: number): HTMLElement | null {
		return container.querySelector(SELECTORS.placeholder(position))
	}

	private isElementVisibleInContainer(element: HTMLElement, container: HTMLElement): boolean {
		const containerRect = container.getBoundingClientRect()
		const elementRect = element.getBoundingClientRect()

		return (
			elementRect.top >= containerRect.top &&
			elementRect.bottom <= containerRect.bottom &&
			elementRect.left >= containerRect.left &&
			elementRect.right <= containerRect.right
		)
	}

	// Scroll calculations

	private calculateScrollTarget(
		placeholder: HTMLElement,
		container: HTMLElement
	): {
		targetScrollTop: number
		scrollDelta: number
	} {
		const placeholderRect = placeholder.getBoundingClientRect()
		const containerRect = container.getBoundingClientRect()
		const placeholderTop = placeholder.offsetTop
		const placeholderHeight = placeholder.offsetHeight
		const containerHeight = container.clientHeight
		const startScrollTop = container.scrollTop

		let targetScrollTop = startScrollTop

		if (placeholderRect.top < containerRect.top) {
			targetScrollTop = placeholderTop
		} else if (placeholderRect.bottom > containerRect.bottom) {
			targetScrollTop = placeholderTop - containerHeight + placeholderHeight
		}

		targetScrollTop = Math.max(
			0,
			Math.min(targetScrollTop, container.scrollHeight - containerHeight)
		)

		return {
			targetScrollTop,
			scrollDelta: targetScrollTop - startScrollTop
		}
	}

	private calculateAdaptiveDuration(scrollDistance: number): number {
		const idealDuration = (scrollDistance / SCROLL_SPEED_PX_PER_SEC) * 1000
		return Math.max(
			ANIMATION_DURATION.SCROLL_MIN,
			Math.min(ANIMATION_DURATION.SCROLL_MAX, idealDuration)
		)
	}

	// Animation implementations

	private startSynchronizedScrollAnimation(
		container: HTMLElement,
		placeholder: HTMLElement,
		onComplete?: () => void
	) {
		this.state.setAnimating(true)

		const startScrollTop = container.scrollTop
		const startGhostPos = { ...this.state.transform! }
		const placeholderRect = placeholder.getBoundingClientRect()

		const { targetScrollTop, scrollDelta } = this.calculateScrollTarget(placeholder, container)
		const scrollDistance = Math.abs(scrollDelta)
		const duration = this.calculateAdaptiveDuration(scrollDistance)

		// Calculate where placeholder will be after scroll completes
		// When container scrolls down by +N, content moves up by -N visually
		const finalGhostPos = {
			x: placeholderRect.left,
			y: placeholderRect.top - scrollDelta
		}

		this.runScrollAnimation({
			container,
			placeholder,
			startScrollTop,
			targetScrollTop,
			scrollDelta,
			startGhostPos,
			finalGhostPos,
			duration,
			onComplete
		})
	}

	private runScrollAnimation(params: {
		container: HTMLElement
		placeholder: HTMLElement
		startScrollTop: number
		targetScrollTop: number
		scrollDelta: number
		startGhostPos: { x: number; y: number }
		finalGhostPos: { x: number; y: number }
		duration: number
		onComplete?: () => void
	}) {
		const startTime = Date.now()

		const animate = () => {
			const progress = Math.min((Date.now() - startTime) / params.duration, 1)
			const easedProgress = easing.outCubic(progress)

			params.container.scrollTop = params.startScrollTop + params.scrollDelta * easedProgress

			this.state.setTransform({
				x: params.startGhostPos.x + (params.finalGhostPos.x - params.startGhostPos.x) * easedProgress,
				y: params.startGhostPos.y + (params.finalGhostPos.y - params.startGhostPos.y) * easedProgress
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.finalizeScrollAnimation(params.container, params.placeholder, params.targetScrollTop, params.onComplete)
			}
		}

		requestAnimationFrame(animate)
	}

	private finalizeScrollAnimation(
		container: HTMLElement,
		placeholder: HTMLElement,
		targetScrollTop: number,
		onComplete?: () => void
	) {
		container.scrollTop = targetScrollTop
		const finalRect = placeholder.getBoundingClientRect()
		this.state.setTransform({ x: finalRect.left, y: finalRect.top })
		this.state.setAnimating(false)
		onComplete?.()
	}

	private startReturnAnimation(onComplete?: () => void) {
		const { originContainerId, originPosition } = this.getOriginInfo()
		const fallbackPos = { ...this.state.originalPosition! }
		const startPos = { ...this.state.transform! }

		this.state.setAnimating(true)

		const startTime = Date.now()

		const animate = () => {
			const progress = Math.min((Date.now() - startTime) / ANIMATION_DURATION.RETURN, 1)
			const easedProgress = easing.outCubic(progress)

			const targetPos = this.getCurrentPlaceholderPosition(originContainerId, originPosition, fallbackPos)

			this.state.setTransform({
				x: startPos.x + (targetPos.x - startPos.x) * easedProgress,
				y: startPos.y + (targetPos.y - startPos.y) * easedProgress
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.state.setAnimating(false)
				onComplete?.()
			}
		}

		requestAnimationFrame(animate)
	}

	private getCurrentPlaceholderPosition(
		containerId: string | null,
		position: number,
		fallback: { x: number; y: number }
	): { x: number; y: number } {
		if (!containerId) return fallback

		const container = this.findContainer(containerId)
		if (!container) return fallback

		const placeholder = this.findPlaceholder(container, position)
		if (!placeholder) return fallback

		const rect = placeholder.getBoundingClientRect()
		return { x: rect.left, y: rect.top }
	}

	// Generic animation runner

	private runAnimation(
		animState: AnimationState,
		easingFn: (t: number) => number,
		onComplete?: () => void
	) {
		this.state.setAnimating(true)

		const animate = () => {
			const elapsed = Date.now() - animState.startTime
			const progress = Math.min(elapsed / animState.duration, 1)
			const easedProgress = easingFn(progress)

			this.state.setTransform({
				x: animState.startPos.x + (animState.targetPos.x - animState.startPos.x) * easedProgress,
				y: animState.startPos.y + (animState.targetPos.y - animState.startPos.y) * easedProgress
			})

			if (progress < 1) {
				requestAnimationFrame(animate)
			} else {
				this.state.setAnimating(false)
				onComplete?.()
			}
		}

		requestAnimationFrame(animate)
	}

	private calculatePlaceholderPosition(targetZone: DropZone): { x: number; y: number } {
		const container = this.findContainer(targetZone.containerId)
		if (!container) {
			return this.calculateFallbackPosition(targetZone)
		}

		const placeholder = this.findPlaceholder(container, targetZone.position)
		if (placeholder) {
			const rect = placeholder.getBoundingClientRect()
			return { x: rect.left, y: rect.top }
		}

		const containerRect = container.getBoundingClientRect()
		return {
			x: containerRect.left,
			y: targetZone.rect.y
		}
	}

	private calculateFallbackPosition(targetZone: DropZone): { x: number; y: number } {
		return {
			x: targetZone.rect.x + (targetZone.rect.width - (this.state.size?.width || 0)) / 2,
			y: targetZone.rect.y + (targetZone.rect.height - (this.state.size?.height || 0)) / 2
		}
	}
}
