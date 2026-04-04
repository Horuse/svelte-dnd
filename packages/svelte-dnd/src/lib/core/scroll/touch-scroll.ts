export class TouchScroll {
	private scrollTarget: Element | null = null
	private lastPos = { x: 0, y: 0 }
	private lastTime = 0
	private velocity = { x: 0, y: 0 }
	private raf: number | null = null

	private static readonly DECELERATION = 0.92
	private static readonly VELOCITY_STOP = 0.05
	private static readonly VELOCITY_ALPHA = 0.7

	get isScrolling() {
		return this.scrollTarget !== null
	}

	start(fromElement: HTMLElement, clientX: number, clientY: number) {
		this.stopMomentum()
		this.scrollTarget = this.findScrollableParent(fromElement)
		this.lastPos = { x: clientX, y: clientY }
		this.lastTime = Date.now()
		this.velocity = { x: 0, y: 0 }
	}

	update(clientX: number, clientY: number) {
		if (!this.scrollTarget) return

		const dx = this.lastPos.x - clientX
		const dy = this.lastPos.y - clientY
		const now = Date.now()
		const dt = now - this.lastTime

		this.scrollTarget.scrollBy(dx, dy)

		if (dt > 0) {
			const a = TouchScroll.VELOCITY_ALPHA
			this.velocity.x = a * (dx / dt) + (1 - a) * this.velocity.x
			this.velocity.y = a * (dy / dt) + (1 - a) * this.velocity.y
		}

		this.lastPos = { x: clientX, y: clientY }
		this.lastTime = now
	}

	end() {
		const target = this.scrollTarget
		this.scrollTarget = null
		if (target) this.applyMomentum(target)
	}

	stopMomentum() {
		if (this.raf !== null) {
			cancelAnimationFrame(this.raf)
			this.raf = null
		}
	}

	private applyMomentum(target: Element) {
		const tick = () => {
			this.velocity.x *= TouchScroll.DECELERATION
			this.velocity.y *= TouchScroll.DECELERATION

			if (
				Math.abs(this.velocity.x) < TouchScroll.VELOCITY_STOP &&
				Math.abs(this.velocity.y) < TouchScroll.VELOCITY_STOP
			) {
				this.raf = null
				return
			}

			target.scrollBy(this.velocity.x * 16, this.velocity.y * 16)
			this.raf = requestAnimationFrame(tick)
		}

		this.raf = requestAnimationFrame(tick)
	}

	private findScrollableParent(el: HTMLElement): Element | null {
		let parent = el.parentElement
		while (parent && parent !== document.body) {
			const style = getComputedStyle(parent)
			if (
				['auto', 'scroll', 'overlay'].includes(style.overflowY) ||
				['auto', 'scroll', 'overlay'].includes(style.overflowX)
			) {
				return parent
			}
			parent = parent.parentElement
		}
		return document.scrollingElement
	}
}
