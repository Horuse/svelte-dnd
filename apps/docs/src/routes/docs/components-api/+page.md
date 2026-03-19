# Components API

## DndProvider

Wraps your drag-and-drop area and provides the `DndController` context to all child components.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `controller` | `DndController` | auto-created | Optional pre-created controller instance |
| `ghost` | `Snippet<[GhostSnippetProps]>` | — | Custom ghost element renderer during drag |

### GhostSnippetProps

```ts
interface GhostSnippetProps {
    element: HTMLElement;
    data?: Record<string, any>;
    itemId: string;
}
```

If no `ghost` snippet is provided, the dragged element's HTML is cloned as the ghost.

---

## DndDraggable

Wraps a single draggable element. Must be a child of `DndDroppable` inside a `DndProvider`.

Each `DndDraggable` automatically renders a `DndPreview` placeholder at its position — you do not need to place `DndPreview` manually.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique identifier for this draggable item |
| `position` | `number` | **required** | Index of this item within the container (used for drop preview placement) |
| `data` | `Record<string, any>` | `{}` | Arbitrary data attached to the item |
| `disabled` | `boolean` | `false` | Disables dragging when `true` |
| `dragDelay` | `number` | `300` | Delay in ms before drag starts on touch devices. During the delay, finger movement scrolls the container. |
| `scrollCancelThreshold` | `number` | `8` | Max movement in px during `dragDelay` before the gesture is treated as a scroll instead of a drag. |
| `class` | `string` | — | Additional CSS class names |

### Events

| Event | Type | Description |
|-------|------|-------------|
| `onDragStart` | `(event: DndDragEvent) => void` | Fired when the drag begins |
| `onDrag` | `(event: DndDragEvent) => void` | Fired on every pointer move during drag |
| `onDragEnd` | `(event: DndDragEvent) => void` | Fired when the drag ends |

### No drag

Add `data-dnd-no-drag` to any element inside `DndDraggable` to prevent drag handling on it. Useful for buttons, inputs, and links that need to receive native events.

```svelte
<DndDraggable class="drag-item" id={task.id} position={index} data={{ type: 'task' }}>
    <button data-dnd-no-drag onclick={() => alert("Test")}>Alert</button>
    {task.label}
</DndDraggable>
```

### Drag handle

Add `data-dnd-handle` to restrict dragging to specific elements. When at least one handle is present, `data-dnd-no-drag` is ignored — only handle elements can initiate a drag.

```svelte
<DndDraggable id={column.id} position={index} data={{ type: 'column' }}>
    <h2 data-dnd-handle>&#x2630; {column.title}</h2>
    <div><!-- clicking here won't drag the column --></div>
</DndDraggable>
```


### DndDragEvent

```ts
interface DndDragEvent {
    source: {
        id: string;
        element: HTMLElement;
        data?: Record<string, any>;
    };
    target?: {
        id: string;
        element: HTMLElement;
        data?: Record<string, any>;
    } | null;
    transform: { x: number; y: number };
}
```

---

## DndDroppable

Defines a container that accepts draggable items. Automatically registers and calculates drop zones. Renders the tail preview (drop after the last item) automatically.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique container identifier |
| `data` | `Record<string, any>` | `{}` | Container data (supports `type` or `accepts` for filtering) |
| `disabled` | `boolean` | `false` | Disables dropping when `true` |
| `direction` | `DndDirection` | `'vertical'` | Layout direction: `'vertical'`, `'horizontal'`, `'grid'` |
| `mode` | `DndMode` | `'sortable'` | `'sortable'` — position-based drop zones with insert previews. `'target'` — single drop zone covering the whole container, no previews. Use for trash zones or any droppable that isn't a sorted list. |
| `overlap` | `number \| string` | `undefined` | How much of the dragged element must overlap this container to activate it. A `number` is pixels of intersection required (`0` = any pixel). A `string` is a CSS-like percentage of the ghost's smaller dimension (e.g. `"25%"`). Default (`undefined`) uses center-point detection. |
| `class` | `string` | — | Additional CSS class names |

### Auto-scroll

`DndDroppable` automatically marks itself with a `data-dnd-scroll` attribute. The auto-scroll feature only activates for containers that carry this attribute, so only `DndDroppable` elements (not arbitrary scrollable ancestors) will be scrolled during a drag.

### Type Filtering

Use the `data` prop to control which items can be dropped into a container. The `accepts` field can be a string or an array of strings:

```svelte
<!-- Only accepts items with data.type === 'task' -->
<DndDroppable id="tasks" data={{ accepts: 'task' }}>

<!-- Accepts multiple types -->
<DndDroppable id="mixed" data={{ accepts: ['task', 'card'] }}>
```

---

## DndPreview

Renders a placeholder at a specific position within a container to indicate where a dragged item will be dropped.

> **Note:** In most cases you do not need to use `DndPreview` directly. `DndDraggable` renders its own preview automatically, and `DndDroppable` renders the tail preview. Use `DndPreview` only when building fully custom container layouts.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerId` | `string` | **required** | Which container this preview belongs to |
| `position` | `number` | **required** | Position index within the container |
| `show` | `boolean` | `true` | Whether the preview should be visible |
| `direction` | `DndDirection` | `'vertical'` | Layout direction — must match the parent `DndDroppable` (`'vertical' | 'horizontal' | 'grid'`) |
| `fallbackHeight` | `number` | `48` | Default height in pixels if element height is unknown |
| `fallbackWidth` | `number` | `48` | Default width in pixels if element width is unknown |
| `class` | `string` | — | Additional CSS class names |

---

## DndDropEvent

Exported type describing a drop event (available from `@horuse/svelte-dnd`).

```ts
interface DndDropEvent {
    source: {
        id: string;
        element: HTMLElement;
        data?: Record<string, any>;
    };
    target: {
        id: string;
        element: HTMLElement;
        data?: Record<string, any>;
    } | null;
}
```
