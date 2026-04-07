import type { DndState } from '../dnd/dnd-state.svelte.js'
import type { DndEventEmitter } from '../dnd/dnd-event-emitter.js'
import type { ScrollController } from '../scroll/scroll-controller.js'
import type { DropResolver } from '../zones/drop-resolver.js'
import type { PreviewConfig } from '../handlers/preview-handler.svelte.js'
import type { AnimationStep } from './steps/animation-step.js'
import type { DropPreview } from '../../types.js'
import { AnimationPipeline } from './steps/animation-pipeline.js'
import { GhostToTargetStep } from './steps/ghost-to-target-step.js'
import { GhostReturnStep } from './steps/ghost-return-step.js'

export class DropAnimationCoordinator {
	private currentAnimation: AnimationPipeline | null = null
	private hidePreviewTimeout: ReturnType<typeof setTimeout> | null = null
	previewShowDelay = 300
	previewCollapseDelay = 200

	constructor(
		private state: DndState,
		private eventEmitter: DndEventEmitter,
		private scrollController: ScrollController,
		private dropResolver: DropResolver
	) {}

	updateDropPreview(pointer: { x: number; y: number }) {
		if (!this.state.dragging) {
			this.state.setDropPreview(null)
			return
		}

		const targetZone = this.dropResolver.findZoneAt(pointer)

		if (targetZone) {
			const preview: DropPreview = {
				containerId: targetZone.containerId,
				position: targetZone.position,
				visible: true,
				draggedElementHeight: this.state.size?.height,
				draggedElementWidth: this.state.size?.width
			}
			this.state.setDropPreview(preview)

			if (this.state.skipDropPreviewAnimation) {
				requestAnimationFrame(() => {
					this.state.setSkipDropPreviewAnimation(false)
				})
			}
		} else {
			const current = this.state.dropPreview
			if (current?.visible) {
				this.state.setDropPreview({ ...current, visible: false })
				if (this.hidePreviewTimeout) clearTimeout(this.hidePreviewTimeout)
				this.hidePreviewTimeout = setTimeout(() => {
					this.hidePreviewTimeout = null
					if (this.state.dropPreview && !this.state.dropPreview.visible) {
						this.state.setDropPreview(null)
					}
				}, 300)
			}
		}
	}

	performDrop(
		sourceId: string,
		sourceData: Record<string, unknown> | undefined,
		targetContainerId: string,
		position: number
	) {
		const targetZone = this.state.zones.find(
			(zone) => zone.containerId === targetContainerId && zone.position === position
		)

		this.state.setPerformingDrop(true)

		if (targetZone && this.state.element && this.state.transform) {
			this.animate(new GhostToTargetStep(this.state, targetZone), () => {
				this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
				this.finalizeDragEnd(sourceId)
			})
		} else {
			this.eventEmitter.notifyDrop(sourceId, sourceData, targetContainerId, position)
			this.finalizeDragEnd(sourceId)
		}
	}

	endDrag(shouldAnimate = true) {
		const itemId = this.state.draggedItem
		const session = this.state.session

		if (itemId) this.eventEmitter.notifyDropCancelled(itemId)

		if (shouldAnimate && session?.originContainerId) {
			this.state.setDropPreview({
				containerId: session.originContainerId,
				position: session.originPosition,
				visible: true,
				draggedElementHeight: session.ghostSize.height,
				draggedElementWidth: session.ghostSize.width
			})
		}

		if (shouldAnimate && session) {
			requestAnimationFrame(() => {
				this.animate(
					new GhostReturnStep(this.state, this.state.originContainerId, this.state.originPosition),
					() => this.finalizeDragEnd(itemId)
				)
			})
		} else {
			this.finalizeDragEnd(itemId)
		}
	}

	setPreviewConfig(config: PreviewConfig) {
		if (config.showDelay !== undefined) this.previewShowDelay = config.showDelay
		if (config.collapseDelay !== undefined) this.previewCollapseDelay = config.collapseDelay
	}

	cancelCurrentAnimation() {
		this.currentAnimation?.cancel()
	}

	destroy() {
		this.currentAnimation?.cancel()
		if (this.hidePreviewTimeout) clearTimeout(this.hidePreviewTimeout)
	}

	// --- Private ---

	private animate(step: AnimationStep, onComplete: () => void): void {
		this.currentAnimation?.cancel()
		const pipeline = AnimationPipeline.chain(step)
		this.currentAnimation = pipeline
		pipeline.execute().then(() => {
			this.currentAnimation = null
			onComplete()
		})
	}

	private finalizeDragEnd(itemId: string | null) {
		this.state.setSkipDropPreviewAnimation(true)
		this.scrollController.clearAll()
		this.state.reset()
		requestAnimationFrame(() => {
			this.state.setPerformingDrop(false)
		})

		if (itemId) {
			this.eventEmitter.notifyDragEnd(itemId)
		}

		setTimeout(() => {
			this.state.setSkipDropPreviewAnimation(false)
		}, 100)
	}
}
