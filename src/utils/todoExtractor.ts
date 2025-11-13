import { HookEvent, ToolUseEvent } from '../types/events.js';

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm: string;
}

export interface TodosSnapshot {
  todos: TodoItem[];
  lastUpdated: number;
}

/**
 * Validate that an unknown value is a valid TodoItem
 */
function isValidTodoItem(item: unknown): item is TodoItem {
  if (typeof item !== 'object' || item === null) {
    return false;
  }

  const todo = item as any;

  return (
    typeof todo.content === 'string' &&
    typeof todo.activeForm === 'string' &&
    typeof todo.status === 'string' &&
    (todo.status === 'pending' ||
     todo.status === 'in_progress' ||
     todo.status === 'completed')
  );
}

/**
 * Extract the most recent TodoWrite snapshot from ToolUse events
 */
export function extractLatestTodos(events: HookEvent[]): TodosSnapshot | null {
  // Find the most recent ToolUse event where toolName === 'TodoWrite'
  // Events are ordered chronologically, so iterate backwards
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];

    // Only process ToolUse events
    if (event.eventType === 'ToolUse') {
      const toolEvent = event as ToolUseEvent;

      if (toolEvent.toolName === 'TodoWrite') {
        const toolInput = toolEvent.toolInput;

        // Validate that toolInput.todos exists and is an array
        if (toolInput && 'todos' in toolInput && Array.isArray(toolInput.todos)) {
          // Filter to only valid todo items
          const validTodos = toolInput.todos.filter(isValidTodoItem);

          if (validTodos.length > 0) {
            return {
              todos: validTodos,
              lastUpdated: event.timestamp
            };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Count todos by status for statistics display
 */
export function countTodosByStatus(todos: TodoItem[]) {
  return todos.reduce((acc, todo) => {
    const status = todo.status;

    // Only count valid status values
    if (status === 'pending' || status === 'in_progress' || status === 'completed') {
      acc[status] = acc[status] + 1;
    }

    return acc;
  }, {
    pending: 0,
    in_progress: 0,
    completed: 0
  } as Record<string, number>);
}
