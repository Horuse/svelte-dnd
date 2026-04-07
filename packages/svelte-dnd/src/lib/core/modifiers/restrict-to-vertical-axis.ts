import type { Modifier } from './modifier.js'

export const restrictToVerticalAxis: Modifier = ({ transform, initialTransform }) => ({
	x: initialTransform.x,
	y: transform.y
})
