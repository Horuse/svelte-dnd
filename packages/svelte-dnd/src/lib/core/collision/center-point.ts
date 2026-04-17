import type { CollisionAlgorithm } from './collision-algorithm.js'

export const centerPoint: CollisionAlgorithm = ({ zones, ghost }) => {
	const cx = ghost.x + ghost.width / 2
	const cy = ghost.y + ghost.height / 2
	return zones.find(zone =>
		cx >= zone.rect.x &&
		cx <= zone.rect.x + zone.rect.width &&
		cy >= zone.rect.y &&
		cy <= zone.rect.y + zone.rect.height
	) ?? null
}
