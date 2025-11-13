import { useState, useMemo, useCallback } from 'react';
import { HookEvent, HookEventType, FilterState } from '../types/events.js';

// Re-export types for convenience
export type { FilterState, HookEventType };

export interface UseFiltersResult {
  filteredEvents: HookEvent[];
  filterState: FilterState;
  toggleEventType: (eventType: HookEventType) => void;
  toggleToolName: (toolName: string) => void;
  setSearchText: (text: string) => void;
  clearFilters: () => void;
  availableToolNames: string[];
}

const ALL_EVENT_TYPES: HookEventType[] = [
  'ToolUse',
  'UserPromptSubmit',
  'Stop',
  'SubagentStop',
  'Notification',
  'PreCompact',
  'SessionStart',
  'SessionEnd'
];

export function useFilters(events: HookEvent[]): UseFiltersResult {
  const [filterState, setFilterState] = useState<FilterState>({
    eventTypes: new Set(ALL_EVENT_TYPES),
    toolNames: new Set(),
    searchText: ''
  });

  // Extract available tool names from events
  const availableToolNames = useMemo(() => {
    const names = new Set<string>();
    events.forEach((event) => {
      if ('toolName' in event && event.toolName) {
        names.add(event.toolName);
      }
    });
    return Array.from(names).sort();
  }, [events]);

  // Toggle event type filter
  const toggleEventType = useCallback((eventType: HookEventType) => {
    setFilterState((prev) => {
      const newTypes = new Set(prev.eventTypes);
      if (newTypes.has(eventType)) {
        newTypes.delete(eventType);
      } else {
        newTypes.add(eventType);
      }
      return { ...prev, eventTypes: newTypes };
    });
  }, []);

  // Toggle tool name filter
  const toggleToolName = useCallback((toolName: string) => {
    setFilterState((prev) => {
      const newNames = new Set(prev.toolNames);
      if (newNames.has(toolName)) {
        newNames.delete(toolName);
      } else {
        newNames.add(toolName);
      }
      return { ...prev, toolNames: newNames };
    });
  }, []);

  // Set search text
  const setSearchText = useCallback((text: string) => {
    setFilterState((prev) => ({ ...prev, searchText: text }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterState({
      eventTypes: new Set(ALL_EVENT_TYPES),
      toolNames: new Set(),
      searchText: ''
    });
  }, []);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      // Filter by event type
      if (!filterState.eventTypes.has(event.eventType)) {
        return false;
      }

      // Filter by tool name (if any tool filters are active)
      if (filterState.toolNames.size > 0) {
        if (!('toolName' in event) || !filterState.toolNames.has(event.toolName)) {
          return false;
        }
      }

      // Filter by search text
      if (filterState.searchText) {
        const searchLower = filterState.searchText.toLowerCase();
        const eventStr = JSON.stringify(event).toLowerCase();
        if (!eventStr.includes(searchLower)) {
          return false;
        }
      }

      return true;
    });
  }, [events, filterState]);

  return {
    filteredEvents,
    filterState,
    toggleEventType,
    toggleToolName,
    setSearchText,
    clearFilters,
    availableToolNames
  };
}
