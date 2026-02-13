# Multi Container

A kanban board with three columns — items can be moved between containers.

Each column is its own `DndDroppable`, and all share one `DragController` via `DndProvider`. The `onDrop` callback receives `targetContainerId` — find the source column, remove the item, and insert it into the target column at `position`.
