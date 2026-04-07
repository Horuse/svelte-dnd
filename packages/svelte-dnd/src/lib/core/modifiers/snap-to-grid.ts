import type { Modifier } from './modifier.js'

export const snapToGrid = (gridSize: number): Modifier =>
	({ transform }) => ({
		x: Math.round(transform.x / gridSize) * gridSize,
		y: Math.round(transform.y / gridSize) * gridSize
	})
