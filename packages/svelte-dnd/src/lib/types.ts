import type { Snippet } from 'svelte'

export type DndDirection = 'vertical' | 'horizontal' | 'grid'

export interface Announcements {
	onDragStart?: (id: string) => string
	onDragOver?: (id: string, containerId: string, position: number) => string
	onDrop?: (id: string, containerId: string, position: number) => string
	onCancel?: (id: string) => string
}

export const defaultAnnouncements: Announcements = {
	onDragStart:  (id) => `Started dragging item ${id}.`,
	onDragOver:   (id, containerId, position) => `Item ${id} is over ${containerId} at position ${position}.`,
	onDrop:       (id, containerId, position) => `Dropped item ${id} into ${containerId} at position ${position}.`,
	onCancel:     (id) => `Dragging ${id} was cancelled.`
}
export type DndMode = 'sortable' | 'target' | (string & {})

export interface DndDragEvent {
	source: {
		id: string
		element: HTMLElement
		data?: Record<string, unknown>
	}
	target?: {
		id: string
		element: HTMLElement
		data?: Record<string, unknown>
	} | null
	transform: {
		x: number
		y: number
	}
}

export interface DndDropEvent {
	source: {
		id: string
		element: HTMLElement
		data?: Record<string, unknown>
	}
	target: {
		id: string
		element: HTMLElement
		data?: Record<string, unknown>
	} | null
}

export interface DropZone {
	containerId: string
	position: number
	direction: DndDirection
	itemId?: string
	rect: {
		x: number
		y: number
		width: number
		height: number
	}
}

export interface DropPreview {
	containerId: string
	position: number
	visible: boolean
	draggedElementHeight?: number
	draggedElementWidth?: number
}

export interface GhostSnippetProps {
	element: HTMLElement
	data?: Record<string, unknown>
	itemId: string
}

export type GhostSnippet = Snippet<[GhostSnippetProps]>

export type DragStartCallback = (itemId: string) => void
export type DragEndCallback = (itemId: string) => void
export type DropCallback = (
	sourceId: string,
	sourceData: Record<string, unknown> | undefined,
	targetContainerId: string,
	position: number
) => void
export type DropCancelledCallback = (itemId: string) => void
export type ZonesInvalidatedCallback = () => void
