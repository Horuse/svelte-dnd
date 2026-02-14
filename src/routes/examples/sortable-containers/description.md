# Sortable Containers

A horizontal board where both **containers** and **tasks** within them can be dragged.

Drag a container by its header to reorder columns horizontally. Drag tasks within or between containers to move them. This is achieved with a single `DragController` and nested `DndDroppable` components:

- The **board** droppable uses `direction="horizontal"` and accepts `'column'` type items
- Each **column** droppable uses `direction="vertical"` and accepts `'task'` type items
- `stopPropagation` on the task area prevents `pointerdown` from bubbling to the column's `DndDraggable`, so dragging from the header moves the column while dragging from the task area moves a task

The existing drop zone calculator filters `[data-draggable-item]` elements by their closest `[data-drop-id]` parent, so nested droppables work correctly without extra configuration.

[view code](https://github.com/Horuse/svelte-dnd/blob/main/src/routes/examples/sortable-containers/%2Bpage.svelte)
