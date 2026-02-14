# Custom Ghost

By default, `DndProvider` clones the dragged element as the ghost. Pass a `ghost` snippet to `DndProvider` for a custom ghost instead.

The snippet receives `{ element, data, itemId }` — use `data` to render whatever you want. This example shows a minimal colored card ghost that differs from the list item appearance.

[view code](https://github.com/Horuse/svelte-dnd/blob/main/src/routes/examples/custom-ghost/%2Bpage.svelte)
