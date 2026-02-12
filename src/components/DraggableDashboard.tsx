'use client';

import { useState, ReactNode, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ModuleItem {
  id: string;
  component: ReactNode;
}

interface SortableItemProps {
  id: string;
  children: ReactNode;
}

function SortableItem({ id, children }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: 'grab',
  };

  return (
    <div ref={setNodeRef} style={style} className="sortable-module">
      <div className="drag-handle" {...attributes} {...listeners}>
        <span className="drag-icon">⋮⋮</span>
      </div>
      {children}
    </div>
  );
}

interface DraggableDashboardProps {
  modules: ModuleItem[];
  storageKey?: string;
}

export default function DraggableDashboard({ modules, storageKey = 'dashboard-order' }: DraggableDashboardProps) {
  const [items, setItems] = useState<ModuleItem[]>(modules);
  const [isClient, setIsClient] = useState(false);

  // Load saved order from localStorage
  useEffect(() => {
    setIsClient(true);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const savedOrder = JSON.parse(saved) as string[];
        // Reorder modules based on saved order
        const orderedItems = savedOrder
          .map((id) => modules.find((m) => m.id === id))
          .filter((m): m is ModuleItem => m !== undefined);
        // Add any new modules that weren't in saved order
        const newModules = modules.filter((m) => !savedOrder.includes(m.id));
        setItems([...orderedItems, ...newModules]);
      } catch {
        setItems(modules);
      }
    } else {
      setItems(modules);
    }
  }, [modules, storageKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Save to localStorage
        localStorage.setItem(storageKey, JSON.stringify(newItems.map((i) => i.id)));
        return newItems;
      });
    }
  };

  // Don't render DnD on server
  if (!isClient) {
    return (
      <div className="dashboard-masonry">
        {modules.map((module) => (
          <div key={module.id} className="sortable-module">
            {module.component}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="dashboard-masonry">
          {items.map((module) => (
            <SortableItem key={module.id} id={module.id}>
              {module.component}
            </SortableItem>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
