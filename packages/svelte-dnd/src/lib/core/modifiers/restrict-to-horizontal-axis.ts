import type { Modifier } from './modifier.js'

export const restrictToHorizontalAxis: Modifier = ({ transform, initialTransform }) => ({
	x: transform.x,
	y: initialTransform.y
})
