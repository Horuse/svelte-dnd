# CSS Custom Properties

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
| `--dnd-draggable-opacity-dragging` | `0.5` | Opacity of the source element while being dragged |
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
