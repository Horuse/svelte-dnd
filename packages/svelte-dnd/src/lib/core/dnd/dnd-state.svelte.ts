import type { DropZone, DropPreview } from '../../types.js'
import type { DragSession } from './drag-session.js'

export class DndState {
	session = $state<DragSession | null>(null)
	dropZones = $state<DropZone[]>([])
	showDebugZones = $state(false)
	isPerformingDrop = $state(false)
	shouldSkipDropPreviewAnimation = $state(false)
	isAnimating = $state(false)

	// --- Getters (same public API as before) ---

	get dragging() { return this.session !== null }
	get element() { return this.session?.element ?? null }
	get transform() { return this.session?.ghostTransform ?? null }
	get draggedItem() { return this.session?.itemId ?? null }
	get draggedType() { return this.session?.draggedItemType ?? null }
	get draggedItemData() { return this.session?.itemData }
	get size() { return this.session?.ghostSize ?? null }
	get elementSize() { return this.session?.ghostSize ?? null }
	get animating() { return this.isAnimating }
	get dropPreview() { return this.session?.dropPreview ?? null }
	get zones() { return this.dropZones }
	get debugZones() { return this.showDebugZones }
	get performingDrop() { return this.isPerformingDrop }
	get skipDropPreviewAnimation() { return this.shouldSkipDropPreviewAnimation }
	get originContainerId() { return this.session?.originContainerId ?? null }
	get originPosition() { return this.session?.originPosition ?? 0 }
	get dragSlotSize() { return this.session?.slotSize ?? null }
	get dragSource() { return this.session?.source ?? null }
	get originalPosition() {
		const r = this.session?.startRect
		return r ? { x: r.left, y: r.top } : null
	}

	// --- Session management ---

	startSession(session: DragSession): void {
		this.session = session
	}

	endSession(): void {
		this.session = null
	}

	// --- Setters that mutate current session or direct fields ---

	setTransform(transform: { x: number; y: number } | null): void {
		if (this.session && transform) this.session.ghostTransform = transform
	}

	setDropPreview(preview: DropPreview | null): void {
		if (this.session) this.session.dropPreview = preview
	}

	setAnimating(value: boolean): void { this.isAnimating = value }
	setDropZones(zones: DropZone[]): void { this.dropZones = zones }
	setPerformingDrop(value: boolean): void { this.isPerformingDrop = value }
	setSkipDropPreviewAnimation(value: boolean): void { this.shouldSkipDropPreviewAnimation = value }
	toggleDebugZones(): void { this.showDebugZones = !this.showDebugZones }

	reset(): void {
		this.session = null
		this.isAnimating = false
		this.dropZones = []
	}
}
