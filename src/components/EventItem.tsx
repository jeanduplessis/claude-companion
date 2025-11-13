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
      case 'ToolUse':
        return colors.preTool;
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

  // Add status indicator based on hook execution
  let statusIndicator = '';
  if ('hookExitCode' in event && event.hookExitCode !== undefined) {
    statusIndicator = event.hookExitCode === 0 ? colors.success('✓') : colors.error('✗');
  }

  // Add hook response indicators
  let hookResponseInfo = '';
  if ('hookResponse' in event && event.hookResponse) {
    const resp = event.hookResponse;

    // Show permission decision for PreToolUse
    if ('permissionDecision' in resp && resp.permissionDecision) {
      const decision = resp.permissionDecision;
      const icon = decision === 'allow' ? '✓' : decision === 'deny' ? '✗' : '?';
      hookResponseInfo = ` ${colors.dim(`[${icon} ${decision}]`)}`;
    }
    // Show block decision for other hook types
    else if ('decision' in resp && resp.decision === 'block') {
      hookResponseInfo = ` ${colors.warning('[blocked]')}`;
    }

    // Show continue=false indicator
    if (resp.continue === false) {
      hookResponseInfo += ` ${colors.error('[stopped]')}`;
    }

    // Show system message indicator
    if (resp.systemMessage) {
      hookResponseInfo += ` ${colors.dim('[msg]')}`;
    }
  }

  return (
    <Box>
      <Text>
        {prefix} <Text dimColor>{time}</Text> {colorFn(`[${typeLabel.padEnd(7)}]`)} {statusIndicator && `${statusIndicator} `}{summary}{hookResponseInfo}
      </Text>
    </Box>
  );
};
