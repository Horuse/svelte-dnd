# Getting Started

## Installation

```bash
bun add @horuse/svelte-dnd
```

Or with npm:

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

1. **DndProvider** wraps your app and creates a `DndController` context.
2. **DndDroppable** defines a container where items can be dropped. Set `direction` to `"vertical"`, `"horizontal"`, or `"grid"`.
3. **DndDraggable** wraps each draggable item. Each must have a unique `id` and a `position` matching its index in the list.
4. **Drop previews are automatic** — `DndDraggable` renders its own preview at `position`, and `DndDroppable` renders the tail preview (after the last item). You never need to place `DndPreview` manually.
5. **The dragged item is hidden automatically** — the `.dnd-draggable--dragging` class sets `opacity: 0` so only the ghost follows the cursor. No manual filtering needed.
6. Use `controller.onDrop()` to handle reordering logic when an item is dropped.
