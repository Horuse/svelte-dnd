/**
 * Parses a CSS timing-function string into a JS interpolation function.
 *
 * Supports:
 * - Keywords: `linear`, `ease`, `ease-in`, `ease-out`, `ease-in-out`
 * - `cubic-bezier(x1, y1, x2, y2)` with arbitrary control points
 *
 * Falls back to `ease-out` and emits a console warning on unknown input.
 *
 * @example
 * const ease = parseEasing('cubic-bezier(0.25, 0.46, 0.45, 0.94)')
 * ease(0)    // => 0
 * ease(0.5)  // => ~0.62
 * ease(1)    // => 1
 */
export function parseEasing(easing: string): (t: number) => number {
	const trimmed = easing.trim().toLowerCase()
	if (trimmed === 'linear') return (t) => t
	if (trimmed === 'ease') return cubicBezierFn(0.25, 0.1, 0.25, 1)
	if (trimmed === 'ease-in') return cubicBezierFn(0.42, 0, 1, 1)
	if (trimmed === 'ease-out') return cubicBezierFn(0, 0, 0.58, 1)
	if (trimmed === 'ease-in-out') return cubicBezierFn(0.42, 0, 0.58, 1)

	const m = trimmed.match(
		/^cubic-bezier\(\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*,\s*([-\d.]+)\s*\)$/
	)
	if (m) {
		return cubicBezierFn(parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3]), parseFloat(m[4]))
	}

	if (typeof console !== 'undefined') {
		console.warn(`[svelte-dnd] Unsupported easing "${easing}", falling back to ease-out`)
	}
	return cubicBezierFn(0, 0, 0.58, 1)
}

/**
 * Cubic-bezier solver. Builds a sample table once, then for each t finds the
 * matching point on the curve via Newton-Raphson. Same algorithm browsers use.
 */
function cubicBezierFn(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
	const SAMPLE_COUNT = 11
	const SAMPLE_STEP = 1 / (SAMPLE_COUNT - 1)
	const samples = new Float32Array(SAMPLE_COUNT)

	const a = (a1: number, a2: number) => 1 - 3 * a2 + 3 * a1
	const b = (a1: number, a2: number) => 3 * a2 - 6 * a1
	const c = (a1: number) => 3 * a1
	const calc = (t: number, a1: number, a2: number) =>
		((a(a1, a2) * t + b(a1, a2)) * t + c(a1)) * t
	const slope = (t: number, a1: number, a2: number) =>
		3 * a(a1, a2) * t * t + 2 * b(a1, a2) * t + c(a1)

	for (let i = 0; i < SAMPLE_COUNT; i++) samples[i] = calc(i * SAMPLE_STEP, x1, x2)

	const tForX = (x: number): number => {
		let intervalStart = 0
		let i = 1
		for (; i !== SAMPLE_COUNT - 1 && samples[i] <= x; i++) intervalStart += SAMPLE_STEP
		i--

		const dist = (x - samples[i]) / (samples[i + 1] - samples[i])
		let guess = intervalStart + dist * SAMPLE_STEP

		for (let j = 0; j < 4; j++) {
			const s = slope(guess, x1, x2)
			if (s === 0) return guess
			guess -= (calc(guess, x1, x2) - x) / s
		}
		return guess
	}

	return (x: number) => {
		if (x <= 0) return 0
		if (x >= 1) return 1
		return calc(tForX(x), y1, y2)
	}
}
