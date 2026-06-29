# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.0.1] - 2026-06-29

### Bug Fixes

- Keep the drop preview tracking when the container scrolls under a stationary cursor, so dragging no longer breaks on a mouse-wheel scroll mid-drag.
- Detect scroll on virtualized lists whose scroll viewport is a nested element.

## [v1.0.0] - 2026-05-11

First stable release.

### Breaking Changes

- **`scroll` config replaced by `behaviors[]`**. Auto-scroll and scroll-sync are now `Behavior` plugins; built-in factories `autoScroll()` and `scrollSync()`, both included by default. Per-droppable override via `sortable({ behaviors })` / `target({ behaviors })`. `controller.setScrollConfig` removed — use `controller.setBehaviors`. `ScrollConfig` type replaced by `AutoScrollConfig`.
- **Simulator API consolidated**. `simulateReturn`, `simulateDrop`, `simulateSwap`, `simulateBatchSwap` are replaced by `controller.animateItem` and `controller.animateLayout`. `SimulateOptions` removed; new types `AnimateItemOptions`, `AnimateLayoutOptions`, `ContainerPosition`.
- **Animation config unified under `animation`**. Top-level `preview` option on `DndController` removed. Renames: `dropDuration` → `drop`, `returnDuration` → `return`, `slotCollapseDuration` → `slotCollapse`, `swapDuration` → `layout`. Preview delays moved into `animation.preview.show` / `animation.preview.hide` as `DelayedTransition` (`{ delay, duration, easing }`). `siblingShift` and `ghostResize` take a `Transition`; `drop`, `return`, `slotCollapse`, `layout`, `keyboardFlight` take a number or `Transition`.
- **`controller.previewConfig` and `setPreviewConfig` removed**. Read from `controller.animation`, patch via `controller.setAnimation`.
- **Ghost rotation no longer applied by the library**. Removed CSS vars `--dnd-ghost-rotation`, `--dnd-ghost-rotation-duration` and the `.dnd-ghost--returning` reset rule. Implement rotation in custom CSS if needed.
- **`PreviewConfig` and `ScrollConfig` types are no longer exported**. Use `AnimationConfig` / `AutoScrollConfig` instead.

### Features

- **Sortable virtualization** via `sortable({ virtual })`. New `VirtualSource` and `SortableSource` types let a virtualizer drive zone geometry from live slot rects. Tested with virtua; other virtualizers should work via the same interface but are unverified. Grid layout falls back to DOM mode.
- **Pluggable `Behavior` plugins**. Custom plugins implement `wrapDropAnimation(next, ctx)` and/or expose `autoScrollConfig`. New exports: `Behavior`, `BehaviorContext`, `AutoScrollConfig`, `autoScroll`, `scrollSync`, `ScrollSyncOptions`.
- **`scrollSync({ threshold })`** — engagement gated by the destination slot's visible fraction.
- **Ghost & preview auto-resize to the destination's item size**, mixing target-sibling and dragged-item dimensions per layout. Exposed reactively as `controller.dropPreviewSize`. CSS vars `--dnd-ghost-resize-duration` / `--dnd-ghost-resize-easing` driven by `animation.ghostResize`.
- **Keyboard navigation expansions**. `Home` / `End`, cross-axis hops between sibling containers, same-row / same-column grid movement, per-keystroke ghost flight to the live slot rect, lockstep scroll-into-view for off-screen targets. Iterates the full position list, so virtualized slots stay reachable. Tunable via `animation.keyboardFlight`.
- **Configurable easing for every animation**. rAF-driven steps accept a number or `{ duration, easing }`; CSS-driven steps (preview show/hide, `siblingShift`, `ghostResize`) gain matching easing fields. `scrollSync` inherits the wrapped step's easing.
- **`parseEasing(str)` helper** exported for custom `AnimationStep` implementations.
- **New CSS vars** `--dnd-preview-easing-in`, `--dnd-preview-easing-out`, `--dnd-ghost-resize-easing` written from `controller.animation`; user CSS still overrides.
- **Runtime setters**: `setBehaviors`, `setAnimation` (deep-merge), `setSensors`, `setAnnouncements`, `setModifiers`, `setDebug`. No need to recreate the controller.
- **Default flex direction for sortable `DndDroppable`** via `:where(.dnd-droppable[data-dnd-layout='vertical'|'horizontal'])`. Consumer classes (Tailwind, custom) win without `!important`. Grid sortables get no default.
- **`Droppable.itemCount` and `Droppable.isVirtualized`** getters expose data length and virtualization mode.
- **Per-call `behaviors` / `easing` override on `animateItem`**.
- **`animateLayout({ morph: true })`** copies missing classes from pre- to post-state element so class-driven CSS transitions run in lockstep with the FLIP transform.
- **New exports**: `GhostSnippet`, `GhostSnippetProps`, `ZonesInvalidatedCallback`.

### Bug Fixes

- Honour explicit `spacing={0}` on `DndDraggable`.
- Clamp sortable drop zones to the container's scroll viewport.
- Siblings no longer jump during slot collapse in scrollable sources.
- Drop no longer fights the virtualizer's scroll-jump compensation.
- Ghost tracks the tail preview correctly when the source slot collapses.
- Repeated `preview.hide()` calls no longer leak collapse timers.
- Overlapping `animateLayout` invocations reject with a clear error instead of corrupting state silently.
- `scrollSync` now engages on tail previews in empty containers (degenerate-rect case).
- Keyboard ghost flight reads the post-update tail spacing, so the first key after a drop lands at the correct rect.
- `KeyboardSensor` no longer activates twice when `Enter` / `Space` bubbles from nested draggables.
- Keyboard navigation no longer triggers auto-scroll (auto-scroll was tied to pointer updates).
- Reactive prop updates on `DndDraggable` / `DndDroppable` / `DndPreview` propagate from the first read — entities are no longer pinned to the initial snapshot.
- Post-drop rect reads in `animateLayout` happen against the updated DOM, fixing stale FLIP transforms.
- `package.json` gains `exports.import` and `exports.default` conditions for correct ESM resolution.
- Removed `aria-grabbed` from the dragged element (deprecated in ARIA 1.1).

### Performance

- Droppables mounting or unmounting mid-drag update zone derivations reactively instead of going stale until the next pointermove.
- First-slot rect cached per drag session, avoiding a synchronous layout on every pointermove when computing `dropPreviewSize`.

### Docs

- New examples: virtualization, target-zones, behaviors live demo.
- New pages: behaviors, `VirtualSource`, SSR FAQ. Examples updated to the consolidated simulator API and runtime setters.

## [v1.0.0-rc.1] - 2026-04-19

Release candidate for v1.0. Public API stabilized — please report regressions before stable.

### Breaking Changes

- **Strategy-instance API on `DndDroppable`**. The `mode` and `direction` props are replaced with a single `strategy` prop that takes a strategy instance. Factories exported: `sortable({ layout, flow })`, `target()`. Custom strategies implement the `ContainerStrategy` interface.
- **`DndLayout` replaces `DndDirection`**. New values: `'vertical' | 'horizontal' | 'grid'`.
- **Rich event objects replace primitive callback arguments**. `onDragStart`, `onDragEnd`, `onDrop`, `onDragOver`, `onDropCancelled` now receive structured `{ item, source, target, … }` objects (`DragStartEvent`, `DropEvent`, `DragEndEvent`, `DragOverEvent`, `DropCancelledEvent`).
- **Per-item drag callbacks removed from `DndDraggable`**. Subscribe via `controller.onDragStart(…)` / `onDrop(…)` / `onDragEnd(…)` / `onDropCancelled(…)` / `onDragOver(…)` instead.
- **Collision API replaces `overlap` prop**. `DndDroppable` now accepts a `collision` prop (or set globally via `DndController({ collision })`) conforming to the `CollisionAlgorithm` contract. Built-ins: `centerPoint` (default), `cursorOver`, `overlap`, `closestCenter`.
- **`overlap()` takes a flat threshold**: `overlap(25)` or `overlap('25%')` instead of the previous object form.
- **`centerPoint` semantics split**: it now tests the ghost's center; the previous cursor-based behaviour is now `cursorOver`.
- **`DndSimulator` class no longer exported**. Use `controller.simulateReturn / simulateDrop / simulateSwap / simulateBatchSwap` instead.
- **`DndState` class no longer exported** (type export remains for advanced use).
- **`--dnd-slot-spacing` CSS variable removed**. Use the reactive `spacing` prop on `DndDroppable` instead.
- **`DropPreview` shape simplified**: `.visible` flag removed (use nullable `DropPreview | null`); ghost-size fields unified into `ghostSize` on the controller.

### Features

- **Grid layout**. `sortable({ layout: 'grid', flow: 'row' | 'column' })` with dedicated grid zone geometry and cross-container slot animations.
- **Sensor system + keyboard accessibility**. Configurable `sensors` on `DndController` (defaults to `[PointerSensor, KeyboardSensor]`) with per-item override on `DndDraggable`. `KeyboardSensor` enables Space/Enter to grab, arrow keys to navigate, Escape to cancel. ARIA live region built into `DndProvider`, plus customizable `announcements` (with `defaultAnnouncements` helper) on `DndController`. Exports: `PointerSensor`, `KeyboardSensor`, `Distance`, `Delay`, plus `SensorDescriptor` / `DistanceConfig` / `DelayConfig` types.
- **Transform modifiers**. Pluggable `Modifier` pipeline on `DndController`. Built-ins: `restrictToVerticalAxis`, `restrictToHorizontalAxis`, `restrictToContainer`, `snapToGrid`.
- **Pluggable collision algorithms** as described above.
- **`onDragOver` event**. Fires when the drag-over target container or position changes.
- **Simulator expansions**. New `simulateSwap` (two-item swap) and `simulateBatchSwap` (FLIP-based multi-item reorder). `simulateReturn` / `simulateDrop` accept `SimulateOptions` with `emitEvents` to fire real `onDrop` / `onDropCancelled`.
- **`stopOnDrop` scroll option** on `ScrollConfig`.
- **Reactive `spacing` prop** on `DndDroppable` (replaces the removed CSS var).
- **Explicit runtime error** when `DndDraggable` / `DndDroppable` render outside a `DndProvider`.

### Bug Fixes

- Slot `position` now syncs reactively with the prop, preventing stale order after `{#each}` reorders.
- Variable-height previews: correct alignment, slot sizing and ghost positioning in both vertical and horizontal lists.
- Cross-container slot size uses the dragged element's own dimensions plus the target container's gap.
- Drop animation no longer resets scroll position; auto-scroll stops cleanly before the ghost flight.
- Drop-animation flags reset on each new drag session so rapid successive drags render correctly.
- Reactive props on `DndDroppable` / `DndDraggable` (`disabled`, `data`, `type`, `accepts`, `collision`, `strategy`, `spacing`, `sensors`) propagate live to the underlying entities.
- Container IDs with special characters work (querySelector escaping).
- `disabled` on `DndDraggable` blocks drag activation in all sensors.
- `KeyboardSensor` deferred listener is cleaned up on destroy.
- Preview `hidePreviewTimeout` cleared on destroy; `clearAll` cleanup regression fixed.
- `data-dnd-scroll` auto-scroll honours scope again; `scheduleRefresh` deduplicated during auto-scroll.

### Internal

- Entity-based architecture (`Draggable`, `Droppable`, `Preview`, `Slot`, `DragSession`) replaces the legacy handler/registrar/session-manager plumbing; strategies read entity state directly rather than traversing the DOM.
- `DndController` split into `DragSessionManager` + `DropAnimationCoordinator` + `TranslationEngine` + `DropResolver`.
- Layout snapshot captured at drag start (transform-free) so reactive transforms never feed back into zone calculations.
- Internal-only surface marked with `@internal`.
- Custom-strategy primitives exposed for advanced use: `AnimationStep`, `InstantStep`, `GhostToTargetStep`, `GhostReturnStep`, `StrategyBindContext`, `ContainerStrategy`, `Droppable`, `DragSession`, `DragSource`.

### Docs

- New pages: sensors, collision, modifiers, accessibility, custom strategies, `DndController` API, simulations.
- Home page redesign.

## [v1.0.0-beta.1] - 2025-04-06

Complete rewrite with a new modular architecture. All previous APIs have changed — see the documentation.

### Breaking Changes
- `DragController` renamed to `DndController`
- `position` is now a required prop on `DndDraggable`
- Type filtering moved from `data={{ type, accepts }}` to dedicated `type` / `accepts` props
- `DndPreview` is no longer used directly — remove all manual placements

### Features
- Drop previews and dragged item visibility handled automatically — no manual `DndPreview`, `hiddenId`, or `visibleItems` needed
- `onDragStart` / `onDragEnd` callbacks no longer return an unsubscribe function — cleanup is automatic
- `DndSimulator` for programmatic drag simulation
- `mode="target"` on `DndDroppable` for non-sortable drop zones (trash, board columns)
- `overlap` prop for intersection-based hit detection
- `onDropCancelled` callback
- `PreviewConfig` and `ScrollConfig` for fine-tuning animations and auto-scroll
- `DndControllerConfig` constructor config on `DndController`
- Touch support: long-press delay, momentum scroll, configurable scroll cancel threshold
- SSR compatibility

### Bug Fixes
- Post-drop translation snap eliminated
- Ghost return animation is scroll-aware
- Drop preview correctly scoped in nested containers
- Drag activation prevented in draggable padding area

### Build
- Migrated to Turborepo monorepo

### Docs
- New docs with live examples

## [v0.3.0] - 2025-02-19

### Features
- Drag handle support via `data-dnd-handle` attribute
- Cursor styling applied to handles only
- Multiple handles per item supported

### Bug Fixes
- Drop zone visibility in debug overlay
- Drag event propagation in nested draggables
- Debug overlay state persistence

### Internal
- Data attributes now use the `data-dnd-` prefix to prevent conflicts with other libraries

### Documentation
- Updated attribute references
- Added drag handle examples
- Expanded FAQ

## [v0.2.0] - 2025-02-17

### Features
- Ghost animation returns to origin with scrolling during cancelled drags
- Auto-scroll functionality scoped to `data-dnd-scroll` attribute

### Bug Fixes
- Mobile support improvements
- Drop zones clipped to visible container viewport boundaries

### Refactoring
- DOM operations and animation logic separated into dedicated modules

## [v0.1.2] - 2025-02-14

No notable changes.

## [v0.1.1] - 2025-02-14

### Bug Fixes
- Fixed placeholder flicker during drag initiation

## [v0.1.0] - 2025-02-14

Initial release.

[v1.0.1]: https://github.com/Horuse/svelte-dnd/compare/v1.0.0...v1.0.1
[v1.0.0]: https://github.com/Horuse/svelte-dnd/compare/v1.0.0-rc.1...v1.0.0
[v1.0.0-rc.1]: https://github.com/Horuse/svelte-dnd/compare/v1.0.0-beta.1...v1.0.0-rc.1
[v1.0.0-beta.1]: https://github.com/Horuse/svelte-dnd/compare/v0.3.0...v1.0.0-beta.1
[v0.3.0]: https://github.com/Horuse/svelte-dnd/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/Horuse/svelte-dnd/compare/v0.1.2...v0.2.0
[v0.1.2]: https://github.com/Horuse/svelte-dnd/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/Horuse/svelte-dnd/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/Horuse/svelte-dnd/releases/tag/v0.1.0
