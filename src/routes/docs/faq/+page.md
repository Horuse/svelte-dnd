# FAQ

Common questions

---

## The button doesn't click

Add `data-dnd-no-drag` attribute to the element so that it behaves as usual and does not start dragging the element.

```svelte
<DndDraggable class="drag-item" id={task.id} data={{ type: 'task' }}>
    <button data-dnd-no-drag onclick={() => alert("Test")}>Alert</button>
    {task.label}
</DndDraggable>
```

---

## How do I drag only by a handle?

Add `data-dnd-handle` to the element that should act as the drag trigger. Once at least one handle is present, dragging from anywhere else on the item is blocked automatically - no need for `data-dnd-no-drag`.

```svelte
<DndDraggable id={column.id} data={{ type: 'column' }}>
    <h2 data-dnd-handle>&#x2630; {column.title}</h2>
    <div><!-- clicking here won't drag --></div>
</DndDraggable>
```

Multiple handles are supported — just add the attribute to each element:

```svelte
<DndDraggable id={item.id}>
    <header data-dnd-handle>&#x2630; drag</header>
    <p>content</p>
    <footer data-dnd-handle>&#x2630; drag</footer>
</DndDraggable>
```

---

## How do I enable auto-scroll in a scrollable container?

Auto-scroll activates for any element that has the `data-dnd-scroll` attribute **and** `overflow: auto` or `overflow: scroll`, when the pointer is near its edge during a drag.

`DndDroppable` adds `data-dnd-scroll` automatically, so its own scrolling works out of the box.

If you have an **external** scrollable wrapper around several droppables (e.g. a horizontal kanban board), add `data-dnd-scroll` manually:

```svelte
<!-- Outer horizontal scroll area -->
<div class="board" data-dnd-scroll style="overflow-x: auto; display: flex;">
  {#each columns as col}
    <DndDroppable id={col.id}>
      ...
    </DndDroppable>
  {/each}
</div>
```

---

## How do I restrict which items can be dropped into a container?

Set a `type` on each `DndDraggable` and an `accepts` list on each `DndDroppable`:

```svelte
<DndDraggable data={{ type: 'task' }} ...>Task</DndDraggable>

<!-- Only accepts 'task' items -->
<DndDroppable data={{ accepts: 'task' }} ...>...</DndDroppable>

<!-- Accepts multiple types -->
<DndDroppable data={{ accepts: ['task', 'card'] }} ...>...</DndDroppable>
```

---

## How do I move items between multiple containers?

Use a single `DragController` shared across all containers. Read `targetContainerId` inside `onDrop` to determine where the item landed:

```svelte
<script>
  const controller = new DragController();

  function onDrop({ itemId, targetContainerId, targetIndex }) {
    // find source container, move item to target container at targetIndex
  }
</script>

<DndDroppable id="list-a" {controller} .../>
<DndDroppable id="list-b" {controller} .../>
```

---

## How do I create a custom ghost element?

Pass a `ghost` snippet to `DndProvider`. The snippet receives `{ element, data, itemId }`:

```svelte
<DndProvider {controller}>
  {#snippet ghost({ element, data })}
    <div class="my-ghost">
      {data.label}
    </div>
  {/snippet}

  <!-- your droppables here -->
</DndProvider>
```

---

## Items aren't draggable on touch / mobile devices

Make sure `touch-action: none` is set on draggable elements. The library sets this via `.dnd-draggable` — do not override it in your own CSS:

```css
/* ✗ don't do this */
.my-item {
  touch-action: auto;
}
```

If you apply `touch-action` somewhere in your layout that affects draggable children, remove it or scope it away from `.dnd-draggable`.

---

## The drop preview doesn't appear

Check two things:

1. The `containerId` prop on `DndPreview` exactly matches the `id` prop on the target `DndDroppable`.
2. The `position` prop is in the range `0 … items.length` (inclusive).

```svelte
<DndDroppable id="my-list" .../>

<!-- must match exactly -->
<DndPreview containerId="my-list" position={previewIndex} />
```

---

See the **Sortable Containers** example for a working implementation.

---

## Ghost returns to the wrong position after a cancelled drag

The library animates the ghost back to the position of the placeholder element. Make sure you restore the original item in `onDragEnd` so the placeholder is still in the DOM at the correct index when the animation starts:

```svelte
controller.onDragEnd(() => {
    hiddenId = null;
    draggedType = null;
});
```

---

## How do I debug drop zones?

Call `controller.toggleDebugZones()` — blue overlays will appear on all drop zones so you can verify their boundaries:

```svelte
<button onclick={() => controller.toggleDebugZones()}>
  Toggle debug zones
</button>
```

See the [CSS Custom Properties & Classes](/docs/css-custom-props) page for the classes used by the overlay elements.

---

## How do I disable dragging conditionally?

Pass the `disabled` prop to `DndDraggable`:

```svelte
<DndDraggable disabled={!isEditing} id={item.id}>
  {item.label}
</DndDraggable>
```

A disabled item is not draggable and receives the `.dnd-draggable--disabled` CSS class.
