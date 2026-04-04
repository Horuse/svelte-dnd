import type { DropPreview } from '../../types.js'

export type DragSource = 'user' | 'programmatic'

export interface DragSession {
	itemId: string
	itemData: Record<string, unknown> | undefined
	element: HTMLElement
	originContainerId: string
	originPosition: number
	startRect: DOMRect
	ghostTransform: { x: number; y: number }
	dropPreview: DropPreview | null
	ghostSize: { width: number; height: number }
	slotSize: { width: number; height: number } | null
	draggedItemType: string | null
	source: DragSource
}
