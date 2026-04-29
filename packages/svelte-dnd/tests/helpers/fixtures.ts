import { vi } from 'vitest'
import { setRect, makeElement, type FakeRect } from './dom.js'
import type { DroppableControllerRef } from '../../src/lib/core/entities/droppable.svelte.js'
import type { ZoneGeometryContext } from '../../src/lib/core/zones/zone-geometry.js'
import type { SlotLayoutRect } from '../../src/lib/core/zones/layout-snapshot.js'
import type { DropZone, DndLayout } from '../../src/lib/types.js'
import type { SensorCallbacks } from '../../src/lib/core/sensors/sensor.js'

export function noopController(): DroppableControllerRef {
	return {
		session: null,
		draggedElement: null,
		cancelSession: () => {},
		slots: new Map(),
		onDragStart: () => () => {},
		onZonesInvalidated: () => () => {},
		onDragEnd: () => () => {},
		refreshDroppableZones: () => {},
		dragging: false
	}
}

export function geometryCtx(partial: Partial<ZoneGeometryContext> = {}): ZoneGeometryContext {
	const containerRect = partial.containerRect ?? ({
		x: 0, y: 0, left: 0, top: 0, right: 200, bottom: 600,
		width: 200, height: 600,
		toJSON: () => ({})
	} as DOMRect)
	return {
		containerId: 'list',
		containerRect,
		scrollLeft: 0,
		scrollTop: 0,
		...partial
	}
}

export function slotRect(slotId: string, position: number, x: number, y: number, w = 100, h = 50): SlotLayoutRect {
	return { slotId, position, offsetLeft: x, offsetTop: y, width: w, height: h }
}

export function dropZone(containerId: string, position: number, x: number, y: number, w: number, h: number, layout: DndLayout = 'vertical'): DropZone {
	return { containerId, position, layout, rect: { x, y, width: w, height: h } }
}

export function scrollableEl(rect: FakeRect, scroll: { left?: number; top?: number } = {}): HTMLElement {
	const el = makeElement()
	setRect(el, rect)
	Object.defineProperty(el, 'scrollLeft', { configurable: true, writable: true, value: scroll.left ?? 0 })
	Object.defineProperty(el, 'scrollTop', { configurable: true, writable: true, value: scroll.top ?? 0 })
	return el
}

export interface PointerEventInit {
	type?: string
	clientX?: number
	clientY?: number
	button?: number
	pointerType?: 'mouse' | 'touch' | 'pen'
	pointerId?: number
	target?: HTMLElement
}

export function pointerEvent(opts: PointerEventInit = {}): PointerEvent {
	const event = new PointerEvent(opts.type ?? 'pointerdown', {
		clientX: opts.clientX ?? 100,
		clientY: opts.clientY ?? 100,
		button: opts.button ?? 0,
		pointerType: opts.pointerType ?? 'mouse',
		pointerId: opts.pointerId ?? 1,
		bubbles: true,
		cancelable: true
	})
	if (opts.target) {
		Object.defineProperty(event, 'target', { configurable: true, value: opts.target })
	}
	return event
}

export type SpyCallbacks = SensorCallbacks & {
	onStart: ReturnType<typeof vi.fn>
	onMove: ReturnType<typeof vi.fn>
	onEnd: ReturnType<typeof vi.fn>
	onCancel: ReturnType<typeof vi.fn>
	onNavigate: ReturnType<typeof vi.fn>
}

export function spyCallbacks(): SpyCallbacks {
	return {
		onStart: vi.fn(),
		onMove: vi.fn(),
		onEnd: vi.fn(),
		onCancel: vi.fn(),
		onNavigate: vi.fn()
	}
}
