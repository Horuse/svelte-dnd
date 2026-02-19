# HTML Attributes

The library sets these attributes automatically — you don't need to add them manually. However, knowing them is useful for CSS targeting and debugging.

---

## Data Attributes

| Attribute                   | Set by | Purpose |
|-----------------------------|--------|---------|
| `data-dnd-drop-id`          | `DndDroppable` | Unique container ID — used for DOM lookup of the container |
| `data-dnd-direction`        | `DndDroppable` | `"vertical"` or `"horizontal"` — read when calculating drop zones |
| `data-dnd-scroll`           | `DndDroppable` | Flag — auto-scroll activates only for elements with this attribute |
| `data-dnd-drag-id`          | `DndDraggable` | Unique item ID — used when identifying a draggable element |
| `data-dnd-no-drag`          | `DndDraggable` | Disables dragging for this element. Use this for buttons, for example, so that they work when clicked. |
| `data-dnd-draggable-item`   | `DndDraggable` | Marker — the selector `:scope > [data-dnd-draggable-item]` collects container items |
| `data-dnd-preview`          | `DndPreview` | Marks a preview (placeholder) element |
| `data-dnd-preview-position` | `DndPreview` | Numeric position of the preview — used to find a specific placeholder |
| `data-dnd-dragged-element`  | `DndProvider` | Marks the ghost element (the div that follows the cursor) |

### External scrollable containers

`DndDroppable` automatically adds `data-dnd-scroll` to itself, so its own scrolling works out of the box. If you have an **external** scrollable wrapper around several droppables, add `data-dnd-scroll` manually:

```html
<div class="scroll-wrapper" data-dnd-scroll style="overflow: auto;">
  <DndDroppable ... />
  <DndDroppable ... />
</div>
```

### Disabling drag on child elements

Add `data-dnd-no-drag` to any element inside a `DndDraggable` to let it receive native pointer events without triggering a drag:

```svelte
<DndDraggable id={item.id}>
  <button data-dnd-no-drag onclick={() => alert("clicked!")}>Click me</button>
  {item.label}
</DndDraggable>
```