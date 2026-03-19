# Simulations

The `DndSimulator` lets you trigger drag animations programmatically — without any user interaction and without firing drop events. Useful for undo/redo flows, onboarding tutorials, or demo sequences.

## Access

`DndSimulator` is available in two ways:

**Via `DndController` (recommended):**

```ts
await controller.simulateReturn(...)
await controller.simulateDrop(...)
```

**Directly (advanced):**

```ts
import { DndSimulator } from '@horuse/svelte-dnd';
```

The controller's methods are thin delegates to `DndSimulator` internally.

---

## simulateReturn

```ts
controller.simulateReturn(
    itemId: string,
    fromContainerId: string,
    toContainerId: string,
    toPosition: number
): Promise<void>
```

Animates an item flying from its current DOM position to a destination. Returns a promise that resolves when the animation completes.

- When `fromContainerId === toContainerId` — uses a scroll-aware return animation (same as a cancelled drag)
- When containers differ — uses a fly-to-target animation

**Does not fire any drop events.**

### Example — undo a move

```ts
// User moved item '3' from 'list-a' to 'list-b'. Undo it:
await controller.simulateReturn('3', 'list-b', 'list-a', originalIndex);

// After the animation completes, update your data model:
moveItem('3', 'list-b', 'list-a', originalIndex);
```

---

## simulateDrop

```ts
controller.simulateDrop(
    itemId: string,
    fromContainerId: string,
    toContainerId: string,
    toPosition: number
): Promise<void>
```

Animates an item flying from its current DOM position to a target container and position. Always uses a fly-to-target animation regardless of whether containers match.

**Does not fire any drop events.**

### Example — auto-sort animation

```ts
// Animate item '2' flying to position 0 in the same list:
await controller.simulateDrop('2', 'list', 'list', 0);

// Then update your data:
moveItemToTop('2');
```

---

## Constraints

- **Cannot run while a drag is in progress.** Both methods reject with an error if `controller.dragging` is `true`.
- **Item must exist in the DOM.** The item must be rendered in `fromContainerId` at the time the simulation starts.
- **No drop events.** Neither `onDrop` nor `onDragEnd` callbacks are called. You must update your data model manually after `await`.

---

## Difference between the two methods

| | `simulateReturn` | `simulateDrop` |
|---|---|---|
| Same-container animation | Scroll-aware return (like cancel) | Fly-to-target |
| Cross-container animation | Fly-to-target | Fly-to-target |
| Typical use case | Undo, cancel, reject | Auto-sort, programmatic move |
