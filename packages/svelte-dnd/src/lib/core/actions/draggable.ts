import type { DndController } from '../dnd/dnd-controller.svelte.js'
import type { SensorDescriptor } from '../sensors/sensor.js'
import type { DndDragEvent } from '../../types.js'
import { DragHandler } from '../handlers/drag-handler.svelte.js'

export interface DraggableOptions {
	id: string
	controller: DndController
	type?: string
	data?: Record<string, unknown>
	disabled?: boolean
	sensors?: SensorDescriptor[]
	dragDelay?: number
	scrollCancelThreshold?: number
	onDragStart?: (event: DndDragEvent) => void
	onDrag?: (event: DndDragEvent) => void
	onDragEnd?: (event: DndDragEvent) => void
}

/**
 * Svelte action that adds drag-and-drop behaviour to any element without
 * adding extra DOM nodes. Unlike `DndDraggable`, the element itself becomes
 * the drag handle — you are responsible for styling and for rendering
 * `DndPreview` placeholders if you need insertion previews.
 *
 * @example
 * ```svelte
 * <li
 *   use:draggable={{ id: item.id, controller }}
 *   style="transform: translate3d({controller.translations.get(item.id)?.x ?? 0}px, {controller.translations.get(item.id)?.y ?? 0}px, 0)"
 * >
 *   {item.name}
 * </li>
 * ```
 */
export function draggable(node: HTMLElement, options: DraggableOptions) {
	let current = options

	node.setAttribute('data-dnd-drag-id', current.id)
	node.setAttribute('data-dnd-draggable-item', '')
	if (!node.hasAttribute('role')) node.setAttribute('role', 'button')
	node.setAttribute('tabindex', current.disabled ? '-1' : '0')
	node.setAttribute('aria-roledescription', 'draggable item')

	const handler = new DragHandler(
		() => node,
		() => ({
			id: current.id,
			type: current.type,
			data: current.data ?? {},
			disabled: current.disabled ?? false,
			dragDelay: current.dragDelay ?? 300,
			scrollCancelThreshold: current.scrollCancelThreshold ?? 8,
			dndController: current.controller,
			sensors: current.sensors,
			callbacks: {
				onDragStart: current.onDragStart,
				onDrag: current.onDrag,
				onDragEnd: current.onDragEnd
			}
		})
	)

	// Reflect drag state as a CSS class so users can style it
	const unsubStart = current.controller.onDragStart((itemId) => {
		if (itemId === current.id) {
			node.classList.add('dnd-dragging')
			node.setAttribute('aria-grabbed', 'true')
		}
	})
	const unsubEnd = current.controller.onDragEnd((itemId) => {
		if (itemId === current.id) {
			node.classList.remove('dnd-dragging')
			node.setAttribute('aria-grabbed', 'false')
		}
	})

	node.addEventListener('pointerdown', handler.handlePointerDown)
	node.addEventListener('click', handler.handleClick)
	node.addEventListener('keydown', handler.handleKeyDown)

	return {
		update(newOptions: DraggableOptions) {
			current = newOptions
			node.setAttribute('data-dnd-drag-id', newOptions.id)
			node.setAttribute('tabindex', newOptions.disabled ? '-1' : '0')
		},
		destroy() {
			handler.destroy()
			unsubStart()
			unsubEnd()
			node.removeEventListener('pointerdown', handler.handlePointerDown)
			node.removeEventListener('click', handler.handleClick)
			node.removeEventListener('keydown', handler.handleKeyDown)
		}
	}
}
