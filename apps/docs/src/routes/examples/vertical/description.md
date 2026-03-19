# Vertical List

The simplest setup — a single `DndDroppable` with `direction="vertical"` (the default).

This example uses 50 items to demonstrate **auto-scroll** near the container edges. A `DndPreview` is placed before each item and one after the last item to show where the dragged item will land.

The `onDrop` callback receives the drop `position` — splice the source item out and insert it at the new position.

[view code](https://github.com/Horuse/svelte-dnd/blob/main/src/routes/examples/vertical/%2Bpage.svelte)