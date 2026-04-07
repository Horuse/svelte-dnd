import type { SensorDescriptor, SensorActivation, SensorOptions, SensorCallbacks } from './sensor.js'
import type { DndController } from '../dnd/dnd-controller.svelte.js'
import type { DropZone } from '../../types.js'
import { DOMHelper } from '../utils/dom-helper.js'

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

		const moveToZone = (zone: DropZone, zones: DropZone[]) => {
			// mouseX/mouseY = zone rect center for collision detection
			const mouseX = zone.rect.x + zone.rect.width / 2
			const mouseY = zone.rect.y + zone.rect.height / 2

			// Ghost visual center = center of filteredItem[zone.position]
			// Math: zone[P].y + zone[P].height = nextZone.rect.y = center of filteredItem[P]
			// For last zone (no nextZone): use zone.rect.y (= center of last item)
			const zoneIdx = zones.findIndex((z) => z.position === zone.position)
			const nextZone = zones[zoneIdx + 1]
			const itemCenterX = zone.rect.x + zone.rect.width / 2
			const itemCenterY = nextZone ? nextZone.rect.y : zone.rect.y

			const ghostX = itemCenterX - offset.x
			const ghostY = itemCenterY - offset.y

			callbacks.onMove({ x: ghostX, y: ghostY }, mouseX, mouseY)
		}

		const refreshZones = () => {
			const seen = new Set<string>()
			for (const zone of this.controller.dropZones) {
				if (seen.has(zone.containerId)) continue
				seen.add(zone.containerId)
				const container = DOMHelper.findContainer(zone.containerId)
				if (container) this.controller.refreshContainerZones(zone.containerId, container)
			}
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
				const firstContainerZones = containerZones.get(containerIds[0]) ?? []
				const firstZone = firstContainerZones[0]
				if (firstZone) moveToZone(firstZone, firstContainerZones)
				return
			}

			const currentZones = containerZones.get(preview.containerId) ?? []
			const currentZoneIdx = currentZones.findIndex((z) => z.position === preview.position)
			const currentContainerIdx = containerIds.indexOf(preview.containerId)

			if (key === 'ArrowDown' || key === 'ArrowRight') {
				if (currentZoneIdx < currentZones.length - 1) {
					moveToZone(currentZones[currentZoneIdx + 1], currentZones)
				} else if (key === 'ArrowRight' && currentContainerIdx < containerIds.length - 1) {
					const nextId = containerIds[currentContainerIdx + 1]
					const nextZones = containerZones.get(nextId) ?? []
					if (nextZones[0]) moveToZone(nextZones[0], nextZones)
				}
			} else if (key === 'ArrowUp' || key === 'ArrowLeft') {
				if (currentZoneIdx > 0) {
					moveToZone(currentZones[currentZoneIdx - 1], currentZones)
				} else if (key === 'ArrowLeft' && currentContainerIdx > 0) {
					const prevId = containerIds[currentContainerIdx - 1]
					const prevZones = containerZones.get(prevId) ?? []
					const lastZone = prevZones[prevZones.length - 1]
					if (lastZone) moveToZone(lastZone, prevZones)
				}
			}
		}

		const onScroll = () => {
			refreshZones()
			const preview = this.controller.dropPreview
			if (!preview) {
				const r = element.getBoundingClientRect()
				callbacks.onMove({ x: r.left, y: r.top }, r.left + offset.x, r.top + offset.y)
				return
			}
			const containerZones = getOrderedContainerZones()
			const zones = containerZones.get(preview.containerId)
			const zone = zones?.find((z) => z.position === preview.position)
			if (zone) moveToZone(zone, zones)
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

		// Defer listener so the current Enter keydown event doesn't immediately trigger onEnd
		setTimeout(() => window.addEventListener('keydown', onWindowKeyDown), 0)
		window.addEventListener('scroll', onScroll, { passive: true, capture: true })

		// Start drag immediately on Enter/Space
		callbacks.onStart(initialTransform)
		started = true

		function cleanup() {
			window.removeEventListener('keydown', onWindowKeyDown)
			window.removeEventListener('scroll', onScroll, { capture: true })
		}

		return { initialTransform, offset, destroy: cleanup }
	}
}
