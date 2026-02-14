# Custom Ghost & Preview Styling

This example combines two features: a **custom ghost** snippet and **scoped preview styling** via CSS custom properties.

Pass a `ghost` snippet to `DndProvider` to replace the default cloned element with a custom drag ghost. The snippet receives `{ element, data, itemId }` — use `data` to render a colored card that differs from the list item.

Each column wrapper sets its own `--dnd-preview-bg`, `--dnd-preview-border`, and `--dnd-preview-border-radius` values. Because `DndPreview` reads these properties from its nearest ancestor, the preview automatically adopts the target container's style as you drag between columns.

[view code](https://github.com/Horuse/svelte-dnd/blob/main/src/routes/examples/custom-ghost/%2Bpage.svelte)
