import type { Snippet } from 'svelte'

export type DndDirection = 'vertical' | 'horizontal' | 'grid'

export interface DndDragEvent {
	source: {
		id: string
		element: HTMLElement
		data?: Record<string, any>
	}
	target?: {
		id: string
		element: HTMLElement
		data?: Record<string, any>
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
		data?: Record<string, any>
	}
	target: {
		id: string
		element: HTMLElement
		data?: Record<string, any>
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
	data?: Record<string, any>
	itemId: string
}

export type GhostSnippet = Snippet<[GhostSnippetProps]>
