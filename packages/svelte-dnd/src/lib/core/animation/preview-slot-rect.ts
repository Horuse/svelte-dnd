import type { Droppable } from '../entities/droppable.svelte.js'

/**
 * Absolute viewport position the ghost should sit at for the preview slot at
 * `(droppable, position)`. Returns `null` for `target` mode, an unmounted
 * preview entity, or missing ghost size.
 */
export function computePreviewSlotTarget(
	droppable: Droppable,
	position: number,
	ghostSize: { width: number; height: number } | null
): { x: number; y: number } | null {
	if (droppable.mode === 'target') return null

	const previewEntity = droppable.getSlotAt(position)?.preview ?? droppable.tailPreview
	const previewEl = previewEntity?.element
	if (!previewEl || !previewEntity) return null

	const slotWrapper = (previewEl.parentElement ?? previewEl) as HTMLElement
	const wrapperRect = slotWrapper.getBoundingClientRect()
	const isHorizontal = previewEntity.isHorizontal
	const alignEndY = previewEntity.align === 'end' && !isHorizontal
	const alignEndX = previewEntity.align === 'end' && isHorizontal
	const y = alignEndY ? wrapperRect.bottom - (ghostSize?.height ?? 0) : wrapperRect.top
	const x = alignEndX ? wrapperRect.right - (ghostSize?.width ?? 0) : wrapperRect.left
	return { x, y }
}
