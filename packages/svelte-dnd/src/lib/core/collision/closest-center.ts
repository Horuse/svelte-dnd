import type { CollisionAlgorithm } from './collision-algorithm.js'

export const closestCenter: CollisionAlgorithm = ({ zones, ghost }) => {
	const ghostCenterX = ghost.x + ghost.width / 2
	const ghostCenterY = ghost.y + ghost.height / 2
	let closest = null
	let minDist = Infinity

	for (const zone of zones) {
		const zoneCenterX = zone.rect.x + zone.rect.width / 2
		const zoneCenterY = zone.rect.y + zone.rect.height / 2
		const dist = Math.hypot(ghostCenterX - zoneCenterX, ghostCenterY - zoneCenterY)
		if (dist < minDist) {
			minDist = dist
			closest = zone
		}
	}

	return closest
}
