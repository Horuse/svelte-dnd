# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[v1.0.0-rc.1]: https://github.com/Horuse/svelte-dnd/compare/v1.0.0-beta.1...v1.0.0-rc.1
[v1.0.0-beta.1]: https://github.com/Horuse/svelte-dnd/compare/v0.3.0...v1.0.0-beta.1
[v0.3.0]: https://github.com/Horuse/svelte-dnd/compare/v0.2.0...v0.3.0
[v0.2.0]: https://github.com/Horuse/svelte-dnd/compare/v0.1.2...v0.2.0
[v0.1.2]: https://github.com/Horuse/svelte-dnd/compare/v0.1.1...v0.1.2
[v0.1.1]: https://github.com/Horuse/svelte-dnd/compare/v0.1.0...v0.1.1
[v0.1.0]: https://github.com/Horuse/svelte-dnd/releases/tag/v0.1.0
