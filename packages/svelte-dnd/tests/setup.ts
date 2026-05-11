// jsdom 29 ships without CSS.escape — polyfill it for tests that exercise
// DOMHelper selectors (CSS.escape escapes special characters in CSS selectors).
if (typeof globalThis.CSS === 'undefined' || typeof globalThis.CSS.escape !== 'function') {
	const cssShim = {
		escape(value: string): string {
			return String(value).replace(/[!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~]/g, '\\$&')
		}
	}
	;(globalThis as unknown as { CSS: typeof globalThis.CSS }).CSS =
		cssShim as unknown as typeof globalThis.CSS
}

// jsdom 29 also lacks the Pointer Capture APIs that PointerSensor calls.
// The library only uses these for browser pointer routing, so a no-op shim
// is sufficient under jsdom.
if (typeof Element.prototype.hasPointerCapture !== 'function') {
	Element.prototype.hasPointerCapture = function () {
		return false
	}
}
if (typeof Element.prototype.setPointerCapture !== 'function') {
	Element.prototype.setPointerCapture = function () {}
}
if (typeof Element.prototype.releasePointerCapture !== 'function') {
	Element.prototype.releasePointerCapture = function () {}
}
