import type { Modifier } from './modifier.js'
import { DOMHelper } from '../utils/dom-helper.js'

export const restrictToContainer = (containerId: string): Modifier =>
	({ transform, ghostSize }) => {
		const rect = DOMHelper.getContainerRect(containerId)
		if (!rect) return transform
		return {
			x: Math.max(rect.left, Math.min(transform.x, rect.right - ghostSize.width)),
			y: Math.max(rect.top, Math.min(transform.y, rect.bottom - ghostSize.height))
		}
	}
