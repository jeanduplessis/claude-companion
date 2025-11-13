import React from 'react';
import { Box, Text } from 'ink';
import { HookEvent } from '../types/events.js';
import { formatAbsoluteTime, getEventTypeLabel, getEventSummary } from '../utils/formatters.js';
import { colors } from '../theme/colors.js';

interface EventItemProps {
  event: HookEvent;
  isSelected?: boolean;
  basePath?: string;
}

export const EventItem: React.FC<EventItemProps> = ({ event, isSelected = false, basePath }) => {
  const getEventTypeColor = (eventType: string): (text: string) => string => {
    switch (eventType) {
      case 'PreToolUse':
        return colors.preTool;
      case 'PostToolUse':
        return colors.postTool;
      case 'UserPromptSubmit':
        return colors.userPrompt;
      case 'Notification':
        return colors.notification;
      case 'SessionStart':
        return colors.sessionStart;
      case 'SessionEnd':
        return colors.sessionEnd;
      default:
        return colors.text;
    }
  };

  const typeLabel = getEventTypeLabel(event.eventType);
  const colorFn = getEventTypeColor(event.eventType);
  const time = formatAbsoluteTime(event.timestamp);
  const summary = getEventSummary(event, basePath);

  const prefix = isSelected ? '→' : ' ';

  // Add status indicator for PostToolUse hooks
  let statusIndicator = '';
  if (event.eventType === 'PostToolUse' && 'hookExitCode' in event && event.hookExitCode !== undefined) {
    statusIndicator = event.hookExitCode === 0 ? colors.success('✓') : colors.error('✗');
  }

  return (
    <Box>
      <Text>
        {prefix} <Text dimColor>{time}</Text> {colorFn(`[${typeLabel.padEnd(8)}]`)} {statusIndicator && `${statusIndicator} `}{summary}
      </Text>
    </Box>
  );
};
