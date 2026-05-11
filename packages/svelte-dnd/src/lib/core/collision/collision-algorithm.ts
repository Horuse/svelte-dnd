import type { DropZone } from '../../types.js'

export interface CollisionContext {
	zones: DropZone[]
	pointer: { x: number; y: number }
	ghost: { x: number; y: number; width: number; height: number }
}

export type CollisionAlgorithm = (context: CollisionContext) => DropZone | null
