import React from 'react';
import { Box, Text } from 'ink';
import { HookEvent } from '../types/events.js';
import { EventItem } from './EventItem.js';

interface EventListProps {
  events: HookEvent[];
  maxHeight?: number;
  selectedIndex?: number; // 0 = newest event, higher = older events
  basePath?: string;
}

export const EventList: React.FC<EventListProps> = ({ events, maxHeight = 20, selectedIndex = 0, basePath }) => {
  if (events.length === 0) {
    return (
      <Box paddingX={1} paddingY={1}>
        <Text dimColor>No events yet. Waiting for hook events...</Text>
      </Box>
    );
  }

  // Convert selectedIndex (0=newest) to actual event array index (0=oldest)
  const selectedEventIndex = events.length - 1 - selectedIndex;

  // Calculate visible window - default to showing the last maxHeight events (tail behavior)
  let startIndex = Math.max(0, events.length - maxHeight);

  // Only scroll the viewport if the selected event would be outside the visible area
  if (selectedEventIndex < startIndex) {
    // Selected event is above the viewport, scroll up to show it at the top
    startIndex = selectedEventIndex;
  } else if (selectedEventIndex >= startIndex + maxHeight) {
    // Selected event is below the viewport, scroll down to show it at the bottom
    startIndex = selectedEventIndex - maxHeight + 1;
  }

  const endIndex = Math.min(startIndex + maxHeight, events.length);
  const visibleEvents = events.slice(startIndex, endIndex);

  return (
    <Box flexDirection="column" paddingX={1}>
      {visibleEvents.map((event, index) => {
        const actualIndex = startIndex + index;
        const isSelected = actualIndex === selectedEventIndex;
        return <EventItem key={event.id} event={event} isSelected={isSelected} basePath={basePath} />;
      })}
    </Box>
  );
};
