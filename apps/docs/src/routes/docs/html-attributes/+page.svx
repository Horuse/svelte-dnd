# HTML Attributes

The library sets these attributes automatically — you don't need to add them manually. However, knowing them is useful for CSS targeting and debugging.

---

## Data Attributes

| Attribute                   | Set by | Purpose |
|-----------------------------|--------|---------|
| `data-dnd-drop-id`          | `DndDroppable` | Unique container ID — used for DOM lookup of the container |
| `data-dnd-direction`        | `DndDroppable` | `"vertical"`, `"horizontal"`, or `"grid"` — read when calculating drop zones |
| `data-dnd-mode`             | `DndDroppable` | `"sortable"` or `"target"` — determines drop zone strategy |
| `data-dnd-overlap`          | `DndDroppable` | Overlap threshold value when the `overlap` prop is set |
| `data-dnd-scroll`           | `DndDroppable` | Flag — auto-scroll activates only for elements with this attribute |
| `data-dnd-drag-id`          | `DndDraggable` | Unique item ID — used when identifying a draggable element |
| `data-dnd-handle`           | `DndDraggable` | Marks an element as the drag handle. When present, dragging starts only from handle elements; `data-dnd-no-drag` is ignored. |
| `data-dnd-no-drag`          | `DndDraggable` | Disables dragging for this element. Ignored when `data-dnd-handle` is used. |
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
<DndDraggable id={item.id} position={index}>
  <button data-dnd-no-drag onclick={() => alert("clicked!")}>Click me</button>
  {item.label}
</DndDraggable>
```

### Restricting drag to a handle

Add `data-dnd-handle` to one or more elements inside a `DndDraggable`. When at least one handle is present, dragging starts only from those elements — everything else is automatically blocked:

```svelte
<DndDraggable id={column.id} position={index}>
  <h2 data-dnd-handle>&#x2630; Drag here</h2>
  <div>clicks here won't drag</div>
</DndDraggable>
```

Multiple handles are supported — just add the attribute to each:

```svelte
<DndDraggable id={item.id} position={index}>
  <header data-dnd-handle>&#x2630; Top handle</header>
  <p>content</p>
  <footer data-dnd-handle>&#x2630; Bottom handle</footer>
</DndDraggable>
```
