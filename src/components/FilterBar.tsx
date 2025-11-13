import React from 'react';
import { Box, Text } from 'ink';
import { HookEventType } from '../types/events.js';
import { FilterState } from '../types/events.js';
import { colors, inkColors } from '../theme/colors.js';

interface FilterBarProps {
  filterState: FilterState;
  onToggleEventType: (eventType: HookEventType) => void;
}

const EVENT_TYPES: HookEventType[] = [
  'PreToolUse',
  'PostToolUse',
  'UserPromptSubmit',
  'Notification',
  'SessionStart',
  'SessionEnd'
];

export const FilterBar: React.FC<FilterBarProps> = ({ filterState, onToggleEventType }) => {
  const renderEventTypeButton = (eventType: HookEventType) => {
    const isActive = filterState.eventTypes.has(eventType);
    const label = eventType.replace(/([A-Z])/g, ' $1').trim();

    return (
      <Text key={eventType}>
        {isActive ? colors.active(` ${label} `) : colors.inactive(` ${label} `)}
        {'  '}
      </Text>
    );
  };

  return (
    <Box borderStyle="single" borderColor={inkColors.border} paddingX={1}>
      <Text>
        <Text bold color={inkColors.text}>Filters: </Text>
        {EVENT_TYPES.map(renderEventTypeButton)}
      </Text>
    </Box>
  );
};
