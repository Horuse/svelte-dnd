import type { CollisionAlgorithm } from './collision-algorithm.js'

export const cursorOver: CollisionAlgorithm = ({ zones, pointer }) => {
	return zones.find(zone =>
		pointer.x >= zone.rect.x &&
		pointer.x <= zone.rect.x + zone.rect.width &&
		pointer.y >= zone.rect.y &&
		pointer.y <= zone.rect.y + zone.rect.height
	) ?? null
}
