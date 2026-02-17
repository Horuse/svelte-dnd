# DragController API

The `DragController` is the core engine that manages all drag-and-drop state and logic. You can create one explicitly or let `DndProvider` create one automatically.

## Constructor

```ts
import { DragController } from '@horuse/svelte-dnd';

const controller = new DragController();
```

Pass it to the provider via the `controller` prop:

```svelte
<DndProvider {controller}>
    <!-- your DnD content -->
</DndProvider>
```

This gives you direct access to the controller's methods and reactive getters.

## Reactive Getters

All getters are Svelte 5 reactive (`$state` / `$derived` internally).

| Getter | Type | Description |
|--------|------|-------------|
| `dragging` | `boolean` | Whether a drag is currently in progress |
| `element` | `HTMLElement \| null` | The DOM element being dragged |
| `transform` | `{ x: number; y: number } \| null` | Current ghost position |
| `draggedItem` | `string \| null` | ID of the item being dragged |
| `draggedType` | `string \| null` | Type of the dragged item (from `data.type`) |
| `draggedItemData` | `Record<string, any> \| undefined` | Data attached to the dragged item |
| `size` | `{ width: number; height: number } \| null` | Size of the dragged element |
| `animatingReturn` | `boolean` | Whether the ghost is animating back to origin |
| `dropPreview` | `DropPreview \| null` | Current drop preview state |
| `dropZones` | `DropZone[]` | All registered drop zones |
| `filteredDropZones` | `DropZone[]` | Drop zones filtered by the dragged item's type |
| `debugZones` | `boolean` | Whether debug zone visualization is enabled |
| `performingDrop` | `boolean` | Whether a drop animation is in progress |
| `skipDropPreviewAnimation` | `boolean` | Whether preview animations are skipped |

## Event Callbacks

All event methods return an unsubscribe function.

### onDragStart

```ts
const unsubscribe = controller.onDragStart((itemId: string) => {
  console.log('Started dragging:', itemId);
});

// Later: unsubscribe()
```

### onDragEnd

```ts
controller.onDragEnd((itemId: string) => {
    console.log('Stopped dragging:', itemId);
});
```

### onDrop

The main callback for handling item reordering or moving between containers.

```ts
controller.onDrop((sourceId, sourceData, targetContainerId, position) => {
    // sourceId: ID of the dragged item
    // sourceData: data attached to the dragged item
    // targetContainerId: ID of the container where item was dropped
    // position: index within the target container
});
```

## Methods

### startDrag

```ts
controller.startDrag(
    element: HTMLElement,
    itemId: string,
    initialPosition: { x: number; y: number },
    data?: Record<string, any>
): void
```

Initiates a drag operation. Called internally by `DndDraggable`.

### updateTransform

```ts
controller.updateTransform(transform: { x: number; y: number }): void
```

Updates the ghost element position during drag.

### updateMousePosition

```ts
controller.updateMousePosition(mouseX: number, mouseY: number): void
```

Updates the mouse position for drop zone detection and auto-scroll.

### performDrop

```ts
controller.performDrop(
    sourceId: string,
    sourceData: any,
    targetContainerId: string,
    position: number
): void
```

Performs a drop with animation to the target zone.

### endDrag

```ts
controller.endDrag(shouldAnimate?: boolean): void
```

Ends the drag. When `shouldAnimate` is `true` (default), the ghost animates back to its origin.

### setSkipDropPreviewAnimation

```ts
controller.setSkipDropPreviewAnimation(value: boolean): void
```

Controls whether `DndPreview` open/close animations are skipped. Useful when you need previews to appear or disappear instantly (e.g. during rapid container switches).

### toggleDebugZones

```ts
controller.toggleDebugZones(): void
```

Toggles visual overlay of all drop zones. Useful for development and debugging.

### destroy

```ts
controller.destroy(): void
```

Cleans up all internal state, listeners, and registries. Called automatically when `DndProvider` unmounts (if it created the controller).

## Drop Zone Management

These methods are used internally by `DndDroppable` but can be called directly for advanced use cases.

| Method | Description |
|--------|-------------|
| `registerDropZones(zones)` | Register all drop zones |
| `calculateDropZones(containerId, element, direction?)` | Calculate zones for a container |
| `mergeDropZones(existing, newZones, containerId)` | Merge new zones into existing set |
| `refreshDropZones()` | Recalculate all drop zones |
| `registerDroppableData(id, data)` | Register container data |
| `unregisterDroppableData(id)` | Unregister container data |

## Transition Utilities

Two helper functions are exported for building custom drop preview components. They produce Svelte transition functions that are aware of the controller's animation state — skipping animation when previews should appear instantly, and using shorter durations during ghost return.

### createConditionalSlide

```ts
import { createConditionalSlide } from '@horuse/svelte-dnd';

const slide = createConditionalSlide(controller);
```

Returns a Svelte `slide`-based transition function. Behaves as follows:
- If `controller.skipDropPreviewAnimation` is `true` — duration is `0ms`
- If `controller.animatingReturn` is `true` — duration is `200ms`
- Otherwise — uses the options passed to the transition

### createConditionalScale

```ts
import { createConditionalScale } from '@horuse/svelte-dnd';

const scale = createConditionalScale(controller);
```

Returns a Svelte `scale`-based transition function. Behaves as follows:
- If `controller.skipDropPreviewAnimation` is `true` — duration is `0ms`
- If `controller.animatingReturn` is `true` — duration is `100ms`
- Otherwise — uses the options passed to the transition

These are used internally by `DndPreview`. Use them if you implement a fully custom preview component.

---

## Types

```ts
interface DropPreview {
    containerId: string;
    position: number;
    visible: boolean;
    draggedElementHeight?: number;
    draggedElementWidth?: number;
}

interface DropZone {
    containerId: string;
    position: number;
    direction: DndDirection;
    itemId?: string;
    rect: { x: number; y: number; width: number; height: number };
}

type DndDirection = 'vertical' | 'horizontal';
```
