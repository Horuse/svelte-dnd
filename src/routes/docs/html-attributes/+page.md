# HTML Attributes & CSS Classes

The library sets these attributes and classes automatically — you don't need to add them manually. However, knowing them is useful for CSS targeting and debugging.

---

## Data Attributes

| Attribute                   | Set by | Purpose |
|-----------------------------|--------|---------|
| `data-drop-id`              | `DndDroppable` | Unique container ID — used for DOM lookup of the container |
| `data-direction`            | `DndDroppable` | `"vertical"` or `"horizontal"` — read when calculating drop zones |
| `data-dnd-scroll`           | `DndDroppable` | Flag — auto-scroll activates only for elements with this attribute |
| `data-drag-id`              | `DndDraggable` | Unique item ID — used when identifying a draggable element |
| `data-dnd-no-drag`          | `DndDraggable` | Disables dragging for this element. Use this for buttons, for example, so that they work when clicked. |
| `data-draggable-item`       | `DndDraggable` | Marker — the selector `:scope > [data-draggable-item]` collects container items |
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

---

## CSS Classes

### DndDraggable

| Class | Applied when |
|-------|-------------|
| `.dnd-draggable` | Always — base class on every draggable item |
| `.dnd-draggable--dragging` | The item is currently being dragged |
| `.dnd-draggable--disabled` | The `disabled` prop is `true` |

Example — dim disabled items:

```css
.dnd-draggable--disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
```

### DndDroppable

| Class | Applied when |
|-------|-------------|
| `.dnd-droppable` | Always — base class on every droppable container |
| `.dnd-droppable--disabled` | The `disabled` prop is `true` |

### DndProvider — ghost element

The ghost is a detached `div` that follows the pointer during drag.

| Class | Applied when |
|-------|-------------|
| `.dnd-ghost` | Always present on the ghost element |
| `.dnd-ghost--returning` | Ghost is animating back after a cancelled drag |

Example — style the ghost:

```css
.dnd-ghost {
  opacity: 0.85;
  transform-origin: top left;
}

.dnd-ghost--returning {
  transition: none; /* library controls the animation */
}
```

### DndPreview

Previews are placeholder elements rendered inside containers to show the future drop position.

| Class | Applied when |
|-------|-------------|
| `.dnd-preview` | Always — outer wrapper of every preview |
| `.dnd-preview__inner` | Inner element inside the preview wrapper |

### Debug zones

When `controller.toggleDebugZones()` is called, the library overlays coloured rectangles on all drop zones.

| Class | Purpose |
|-------|---------|
| `.dnd-debug-zone` | Each individual drop zone overlay |
| `.dnd-debug-zone--first` | Highlights the first zone in a container |
| `.dnd-debug-zone__label` | Text label showing zone index |
