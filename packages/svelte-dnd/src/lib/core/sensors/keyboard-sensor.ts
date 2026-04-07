import type { SensorDescriptor, SensorActivation, SensorOptions, SensorCallbacks } from './sensor.js'
import type { DndController } from '../dnd/dnd-controller.svelte.js'
import type { DropZone } from '../../types.js'

export class KeyboardSensor implements SensorDescriptor {
	constructor(private controller: DndController) {}

	activate(
		event: Event,
		element: HTMLElement,
		_options: SensorOptions,
		callbacks: SensorCallbacks
	): SensorActivation | null {
		if (!(event instanceof KeyboardEvent)) return null
		if (event.key !== 'Enter' && event.key !== ' ') return null

		event.preventDefault()
		event.stopPropagation()

		const rect = element.getBoundingClientRect()
		const offset = { x: rect.width / 2, y: rect.height / 2 }
		const initialTransform = { x: rect.left, y: rect.top }

		let started = false

		const moveToZone = (zone: DropZone) => {
			const centerX = zone.rect.x + zone.rect.width / 2
			const centerY = zone.rect.y + zone.rect.height / 2
			callbacks.onMove(
				{ x: centerX - offset.x, y: centerY - offset.y },
				centerX,
				centerY
			)
		}

		const getOrderedContainerZones = (): Map<string, DropZone[]> => {
			const map = new Map<string, DropZone[]>()
			for (const zone of this.controller.filteredDropZones) {
				if (!map.has(zone.containerId)) map.set(zone.containerId, [])
				map.get(zone.containerId)!.push(zone)
			}
			for (const [, zones] of map) zones.sort((a, b) => a.position - b.position)
			return map
		}

		const navigate = (key: string) => {
			const containerZones = getOrderedContainerZones()
			const containerIds = [...containerZones.keys()]
			const preview = this.controller.dropPreview

			if (!preview) {
				// First navigation: jump to the first available zone
				const firstZone = containerZones.get(containerIds[0])?.[0]
				if (firstZone) moveToZone(firstZone)
				return
			}

			const currentZones = containerZones.get(preview.containerId) ?? []
			const currentZoneIdx = currentZones.findIndex((z) => z.position === preview.position)
			const currentContainerIdx = containerIds.indexOf(preview.containerId)

			if (key === 'ArrowDown' || key === 'ArrowRight') {
				if (currentZoneIdx < currentZones.length - 1) {
					moveToZone(currentZones[currentZoneIdx + 1])
				} else if (key === 'ArrowRight' && currentContainerIdx < containerIds.length - 1) {
					const nextId = containerIds[currentContainerIdx + 1]
					const firstZone = containerZones.get(nextId)?.[0]
					if (firstZone) moveToZone(firstZone)
				}
			} else if (key === 'ArrowUp' || key === 'ArrowLeft') {
				if (currentZoneIdx > 0) {
					moveToZone(currentZones[currentZoneIdx - 1])
				} else if (key === 'ArrowLeft' && currentContainerIdx > 0) {
					const prevId = containerIds[currentContainerIdx - 1]
					const prevZones = containerZones.get(prevId) ?? []
					const lastZone = prevZones[prevZones.length - 1]
					if (lastZone) moveToZone(lastZone)
				}
			}
		}

		const onWindowKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				e.preventDefault()
				cleanup()
				callbacks.onCancel()
				return
			}

			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault()
				cleanup()
				callbacks.onEnd()
				return
			}

			if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
				e.preventDefault()
				if (!started) {
					callbacks.onStart(initialTransform)
					started = true
				}
				navigate(e.key)
			}
		}

		window.addEventListener('keydown', onWindowKeyDown)

		// Start drag immediately on Enter/Space
		callbacks.onStart(initialTransform)
		started = true

		function cleanup() {
			window.removeEventListener('keydown', onWindowKeyDown)
		}

		return { initialTransform, offset, destroy: cleanup }
	}
}
