import type { CollisionAlgorithm } from './collision-algorithm.js'

function parseThreshold(value: number | string, ghost: { width: number; height: number }): number {
	if (typeof value === 'string' && value.endsWith('%')) {
		const pct = parseFloat(value) / 100
		return pct * Math.min(ghost.width, ghost.height)
	}
	return typeof value === 'number' ? value : parseFloat(value) || 0
}

/**
 * Minimum overlap required on both axes before a zone is considered hit.
 * Number = pixels. String ending in `%` = fraction of `min(ghost.width, ghost.height)`.
 * Defaults to 0 (any overlap).
 */
export const overlap = (threshold: number | string = 0): CollisionAlgorithm => {
	return ({ zones, ghost }) => {
		for (const zone of zones) {
			const px = parseThreshold(threshold, ghost)

			const intersectW =
				Math.min(ghost.x + ghost.width, zone.rect.x + zone.rect.width) -
				Math.max(ghost.x, zone.rect.x)
			const intersectH =
				Math.min(ghost.y + ghost.height, zone.rect.y + zone.rect.height) -
				Math.max(ghost.y, zone.rect.y)

			if (intersectW > px && intersectH > px) return zone
		}
		return null
	}
}
