# Components API

## DndProvider

Wraps your drag-and-drop area and provides the `DragController` context to all child components.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `controller` | `DragController` | auto-created | Optional pre-created controller instance |
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

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique identifier for this draggable item |
| `data` | `Record<string, any>` | `{}` | Arbitrary data attached to the item |
| `disabled` | `boolean` | `false` | Disables dragging when `true` |
| `class` | `string` | — | Additional CSS class names |

### Events

| Event | Type | Description |
|-------|------|-------------|
| `onDragStart` | `(event: DndDragEvent) => void` | Fired when the drag begins |
| `onDrag` | `(event: DndDragEvent) => void` | Fired on every pointer move during drag |
| `onDragEnd` | `(event: DndDragEvent) => void` | Fired when the drag ends |

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

Defines a container that accepts draggable items. Automatically registers and calculates drop zones.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `id` | `string` | **required** | Unique container identifier |
| `data` | `Record<string, any>` | `{}` | Container data (supports `type` or `accepts` for filtering) |
| `disabled` | `boolean` | `false` | Disables dropping when `true` |
| `direction` | `DndDirection` | `'vertical'` | Layout direction: `'vertical'`, `'horizontal'` |
| `class` | `string` | — | Additional CSS class names |

### Type Filtering

Use the `data` prop to control which items can be dropped into a container:

```svelte
<!-- Only accepts items with data.type === 'task' -->
<DndDroppable id="tasks" data={{ accepts: 'task' }}>
```

---

## DndPreview

Renders a placeholder at a specific position within a container to indicate where a dragged item will be dropped.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `containerId` | `string` | **required** | Which container this preview belongs to |
| `position` | `number` | **required** | Position index within the container |
| `show` | `boolean` | `true` | Whether the preview should be visible |
| `direction` | `DndDirection` | `'vertical'` | Layout direction — must match the parent `DndDroppable` |
| `fallbackHeight` | `number` | `48` | Default height in pixels if element height is unknown |
| `fallbackWidth` | `number` | `48` | Default width in pixels if element width is unknown |
| `class` | `string` | — | Additional CSS class names |

### Usage Pattern

Place a `DndPreview` before each `DndDraggable` and one after the last item:

```svelte
{#each items as item, index (item.id)}
    <DndPreview containerId="list" position={index} />
    <DndDraggable id={item.id}>...</DndDraggable>
{/each}

<DndPreview containerId="list" position={items.length} />
```

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
