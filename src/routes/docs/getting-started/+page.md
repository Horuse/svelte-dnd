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

A minimal working drag-and-drop setup requires four components: `DndProvider`, `DndDroppable`, `DndDraggable`, and `DndPreview`.

```svelte
<script lang="ts">
    import {
        DndProvider,
        DndDroppable,
        DndDraggable,
        DndPreview,
        DragController
    } from '@horuse/svelte-dnd';
    import { onDestroy } from 'svelte';

    let items = $state([
        { id: '1', label: 'First item' },
        { id: '2', label: 'Second item' },
        { id: '3', label: 'Third item' }
    ]);

    const controller = new DragController();
    const dropPreview = $derived(controller.dropPreview);

    // Hide the dragged item from the list during drag
    let hiddenId = $state<string | null>(null);
    const visibleItems = $derived(
        items.filter((item) => item.id !== hiddenId)
    );

    const unsubStart = controller.onDragStart((id) => {
        hiddenId = id;
    });
    const unsubEnd = controller.onDragEnd(() => {
        hiddenId = null;
    });

    controller.onDrop((sourceId, sourceData, targetContainerId, position) => {
        const fromIndex = items.findIndex((item) => item.id === sourceId);
        if (fromIndex === -1) return;

        const updated = [...items];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(position, 0, moved);
        items = updated;
    });

    onDestroy(() => {
        unsubStart();
        unsubEnd();
    });
</script>

<DndProvider {controller}>
    <DndDroppable id="list" direction="vertical">
        {#each visibleItems as item, index (item.id)}
            <DndPreview
                containerId="list"
                position={index}
                show={dropPreview?.containerId === 'list'
                && dropPreview?.position === index}
            />

            <DndDraggable id={item.id}>
                <div>{item.label}</div>
            </DndDraggable>
        {/each}

        <DndPreview
            containerId="list"
            position={visibleItems.length}
            show={dropPreview?.containerId === 'list'
            && dropPreview?.position === visibleItems.length}
        />
    </DndDroppable>
</DndProvider>
```

## How It Works

1. **DndProvider** wraps your app and creates a `DragController` context.
2. **DndDroppable** defines a container where items can be dropped. Set `direction` to `"vertical"` or `"horizontal"`.
3. **DndDraggable** wraps each draggable item. Each must have a unique `id`.
4. **DndPreview** renders a placeholder at each potential drop position. Place one before each item and one after the last item.
5. **Hide the dragged item** — subscribe to `onDragStart` / `onDragEnd` and filter out the dragged item from the rendered list. This removes the original element from the DOM flow so only the ghost follows the cursor.
6. Use `controller.onDrop()` to handle reordering logic when an item is dropped.
