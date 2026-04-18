import type { Snippet } from 'svelte'

export type DndLayout = 'vertical' | 'horizontal' | 'grid'

// --- Rich event types ---

export interface DndItemInfo {
	id: string
	data: Record<string, unknown> | undefined
	type: string | undefined
	element: HTMLElement
}

export interface DndContainerInfo {
	id: string
	data: Record<string, unknown> | undefined
	layout: DndLayout
	mode: DndMode
	disabled: boolean
	accepts: string | string[] | undefined
	/**
	 * Insertion index within the container.
	 * `0` = before all items, `items.length` = after all items.
	 * On `source`, it's the item's original index; on `target`/`current`, it's where the
	 * item would be inserted. Not an index into your data array — always the slot between items.
	 */
	position: number
}

export interface DragStartEvent {
	item: DndItemInfo
	source: DndContainerInfo
}

export interface DropEvent {
	item: DndItemInfo
	source: DndContainerInfo
	target: DndContainerInfo
}

export interface DragEndEvent {
	item: DndItemInfo
	source: DndContainerInfo
	target: DndContainerInfo | null
	cancelled: boolean
}

export interface DragOverEvent {
	item: DndItemInfo
	source: DndContainerInfo
	current: DndContainerInfo
	previous: DndContainerInfo | null
}

export interface DropCancelledEvent {
	item: DndItemInfo
	source: DndContainerInfo
}

// --- Callback types ---

export type DragStartCallback = (event: DragStartEvent) => void
export type DragEndCallback = (event: DragEndEvent) => void
export type DropCallback = (event: DropEvent) => void
export type DragOverCallback = (event: DragOverEvent) => void
export type DropCancelledCallback = (event: DropCancelledEvent) => void
export type ZonesInvalidatedCallback = () => void

// --- Announcements ---

export interface Announcements {
	onDragStart?: (event: DragStartEvent) => string
	onDragOver?: (event: DragOverEvent) => string
	onDrop?: (event: DropEvent) => string
	onCancel?: (event: DropCancelledEvent) => string
}

export const defaultAnnouncements: Announcements = {
	onDragStart: ({ item }) => `Started dragging item ${item.id}.`,
	onDragOver: ({ item, current }) => `Item ${item.id} is over ${current.id} at position ${current.position}.`,
	onDrop: ({ item, target }) => `Dropped item ${item.id} into ${target.id} at position ${target.position}.`,
	onCancel: ({ item }) => `Dragging ${item.id} was cancelled.`
}

export type DndMode = 'sortable' | 'target' | (string & {})

export interface DropZone {
	containerId: string
	position: number
	layout: DndLayout
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
}

export interface GhostSnippetProps {
	element: HTMLElement
	data?: Record<string, unknown>
	itemId: string
}

export type GhostSnippet = Snippet<[GhostSnippetProps]>
