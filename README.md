# @horuse/svelte-dnd

A drag-and-drop library for Svelte 5 with animated drop previews, auto-scroll, and multi-container support.

## Features

- Vertical, horizontal layouts
- Animated drop previews that follow the dragged item
- Auto-scroll when dragging near container edges
- Move items between multiple containers (kanban-style)
- Custom ghost element via Svelte snippets
- Zero dependencies beyond Svelte 5

## Installation

```bash
npm install @horuse/svelte-dnd
```

## Quick Start

```svelte
<script lang="ts">
  import { DndProvider, DndDroppable, DndDraggable, DndPreview, DragController } from '@horuse/svelte-dnd';

  let items = $state([
    { id: '1', label: 'Item 1' },
    { id: '2', label: 'Item 2' },
    { id: '3', label: 'Item 3' }
  ]);

  const controller = new DragController();
  const dropPreview = $derived(controller.dropPreview);

  controller.onDrop((sourceId, _data, _containerId, position) => {
    const fromIndex = items.findIndex((item) => item.id === sourceId);
    if (fromIndex === -1) return;

    const updated = [...items];
    const [moved] = updated.splice(fromIndex, 1);
    updated.splice(position, 0, moved);
    items = updated;
  });
</script>

<DndProvider {controller}>
  <DndDroppable id="list" direction="vertical">
    {#each items as item, index (item.id)}
      <DndPreview
        containerId="list"
        position={index}
        show={dropPreview?.containerId === 'list' && dropPreview?.position === index}
      />
      <DndDraggable id={item.id}>
        <div>{item.label}</div>
      </DndDraggable>
    {/each}
    <DndPreview
      containerId="list"
      position={items.length}
      show={dropPreview?.containerId === 'list' && dropPreview?.position === items.length}
    />
  </DndDroppable>
</DndProvider>
```

## Documentation

Full docs and live examples are available at the [documentation site](https://svelte-dnd.vercel.app).
