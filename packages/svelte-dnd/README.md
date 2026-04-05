# @horuse/svelte-dnd

[![npm](https://img.shields.io/npm/v/@horuse/svelte-dnd.svg?style=flat-square)](https://www.npmjs.com/package/@horuse/svelte-dnd)
[![GitHub issues](https://img.shields.io/github/issues/Horuse/svelte-dnd.svg?style=flat-square)](https://github.com/Horuse/svelte-dnd/issues)

A drag-and-drop library for Svelte 5 with animated drop previews, auto-scroll, and multi-container support.

![DND preview](https://github.com/Horuse/svelte-dnd/blob/main/static/preview.gif?raw=true)

## Features

- Vertical, horizontal layouts
- Pointer & touch support — works seamlessly on mobile devices
- Animated drop previews rendered automatically
- Auto-scroll when dragging near container edges
- Move items between multiple containers (kanban-style)
- Custom ghost element via Svelte snippets
- Zero dependencies beyond Svelte 5

## Installation

```bash
npm install @horuse/svelte-dnd
```

## Basic Example

A minimal working drag-and-drop setup requires three components: `DndProvider`, `DndDroppable`, and `DndDraggable`. Drop previews are rendered automatically — no manual placement needed.

```svelte
<script lang="ts">
    import {
        DndProvider,
        DndDroppable,
        DndDraggable,
        DndController
    } from '@horuse/svelte-dnd';

    let items = $state([
        { id: '1', label: 'First item' },
        { id: '2', label: 'Second item' },
        { id: '3', label: 'Third item' }
    ]);

    const controller = new DndController();

    controller.onDrop((sourceId, sourceData, targetContainerId, position) => {
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
            <DndDraggable id={item.id} position={index}>
                {item.label}
            </DndDraggable>
        {/each}
    </DndDroppable>
</DndProvider>
```

## How It Works

1. **DndProvider** wraps your app and provides the `DndController` context to all child components.
2. **DndDroppable** defines a container where items can be dropped. Set `direction` to `"vertical"` or `"horizontal"`.
3. **DndDraggable** wraps each draggable item. Each must have a unique `id` and a `position` matching its index in the list.
4. **The dragged item is hidden automatically** — the `.dnd-draggable--dragging` class sets `opacity: 0` so only the ghost follows the cursor. No manual filtering needed.
5. Use `controller.onDrop()` to handle reordering logic when an item is dropped.

## Documentation

Full docs and live examples are available at the [documentation site](https://svelte-dnd.vercel.app).
