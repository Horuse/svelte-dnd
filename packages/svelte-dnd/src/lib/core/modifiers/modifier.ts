export interface ModifierContext {
	transform: { x: number; y: number }
	initialTransform: { x: number; y: number }
	ghostSize: { width: number; height: number }
	originContainerId: string
}

export type Modifier = (context: ModifierContext) => { x: number; y: number }
