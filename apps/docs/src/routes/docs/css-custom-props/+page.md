# CSS Custom Properties & Classes

All `--dnd-*` CSS custom properties can be set on any ancestor element to customize the look and feel of the drag-and-drop components.

## Ghost Element

These properties control the floating ghost element that follows the cursor during drag.

| Property | Default | Description |
|----------|---------|-------------|
| `--dnd-ghost-z-index` | `9999` | Stacking order of the ghost element |
| `--dnd-ghost-opacity` | `0.8` | Opacity of the ghost element |
| `--dnd-ghost-rotation` | `3deg` | Rotation angle applied during drag |
| `--dnd-ghost-rotation-duration` | `200ms` | Transition speed for the rotation animation |
| `--dnd-ghost-scale` | `1` | Scale factor of the ghost element |

## Draggable Element

These properties control the appearance and cursor of draggable items.

| Property | Default | Description |
|----------|---------|-------------|
| `--dnd-draggable-cursor` | `grab` | Cursor when hovering over a draggable item |
| `--dnd-draggable-cursor-active` | `grabbing` | Cursor while actively dragging |
| `--dnd-draggable-cursor-disabled` | `default` | Cursor when the item is disabled |
| `--dnd-draggable-opacity-dragging` | `0` | Opacity of the source element while being dragged (hidden by default — only the ghost is visible) |
| `--dnd-draggable-opacity-disabled` | `0.5` | Opacity when the item is disabled |

## Droppable Container

| Property | Default | Description |
|----------|---------|-------------|
| `--dnd-droppable-min-height` | `20px` | Minimum height of an empty droppable container |

## Drop Preview

These properties control the placeholder that appears at potential drop positions.

| Property | Default | Description |
|----------|---------|-------------|
| `--dnd-preview-transition-duration` | `200ms` | Height transition speed of the preview |
| `--dnd-preview-bg` | `rgba(0, 0, 0, 0.05)` | Background color of the preview indicator |
| `--dnd-preview-border` | `2px dashed rgba(0, 0, 0, 0.2)` | Border style of the preview indicator |
| `--dnd-preview-border-radius` | `8px` | Border radius of the preview indicator |

## Customization Examples

### Subtle ghost with no rotation

```css
:root {
  --dnd-ghost-opacity: 0.6;
  --dnd-ghost-rotation: 0deg;
  --dnd-ghost-scale: 0.95;
}
```

### Show the original item while dragging

```css
:root {
  --dnd-draggable-opacity-dragging: 0.3;
}
```

### Custom preview colors

```css
:root {
  --dnd-preview-bg: rgba(59, 130, 246, 0.1);
  --dnd-preview-border: 2px dashed rgba(59, 130, 246, 0.4);
  --dnd-preview-border-radius: 4px;
}
```

### Scoped per container

```svelte
<div style="--dnd-draggable-cursor: move; --dnd-draggable-opacity-dragging: 0.3;">
  <DndDroppable id="custom-container">
    <!-- items with custom cursor and drag opacity -->
  </DndDroppable>
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
