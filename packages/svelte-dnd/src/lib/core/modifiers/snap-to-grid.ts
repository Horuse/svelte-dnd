import type { Modifier } from './modifier.js'

export const snapToGrid =
	(gridSize: number | { x: number; y: number }): Modifier =>
	({ transform }) => {
		const gx = typeof gridSize === 'number' ? gridSize : gridSize.x
		const gy = typeof gridSize === 'number' ? gridSize : gridSize.y
		return {
			x: Math.round(transform.x / gx) * gx,
			y: Math.round(transform.y / gy) * gy
		}
	}
