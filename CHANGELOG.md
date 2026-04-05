# Changelog

All notable changes to this project will be documented in this file.

## [v1.0.0-beta.1] - unreleased

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
