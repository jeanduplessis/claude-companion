import React from 'react';
import { Box } from 'ink';
import { HookEvent, Session } from '../../types/events.js';
import { FilterState, HookEventType } from '../../state/useFilters.js';
import { FilterBar } from '../FilterBar.js';
import { EventList } from '../EventList.js';
import { EventDetail } from '../EventDetail.js';

interface EventsViewProps {
  session: Session | null;
  filteredEvents: HookEvent[];
  filterState: FilterState;
  showFilters: boolean;
  selectedIndex: number;
  eventListHeight: number;
  eventDetailHeight: number;
  terminalWidth: number;
  onToggleEventType: (eventType: HookEventType) => void;
}

export const EventsView: React.FC<EventsViewProps> = ({
  session,
  filteredEvents,
  filterState,
  showFilters,
  selectedIndex,
  eventListHeight,
  eventDetailHeight,
  terminalWidth,
  onToggleEventType
}) => {
  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Filter Bar */}
      {showFilters && (
        <FilterBar
          filterState={filterState}
          onToggleEventType={onToggleEventType}
        />
      )}

      {/* Event List */}
      <Box flexDirection="column" height={eventListHeight}>
        <EventList
          events={filteredEvents}
          maxHeight={20}
          selectedIndex={selectedIndex}
          basePath={session?.metadata?.cwd}
        />
      </Box>

      {/* Event Detail Panel */}
      <Box height={eventDetailHeight}>
        <EventDetail
          event={filteredEvents.length > 0 ? filteredEvents[filteredEvents.length - 1 - selectedIndex] : null}
          height={eventDetailHeight}
          width={terminalWidth}
          basePath={session?.metadata?.cwd}
        />
      </Box>
    </Box>
  );
};
