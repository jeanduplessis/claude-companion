import React from 'react';
import { Box, Text } from 'ink';
import { HookEvent } from '../types/events.js';
import { formatAbsoluteTime, formatToolInput } from '../utils/formatters.js';
import { colors, inkColors } from '../theme/colors.js';
import { makePathRelative } from '../utils/pathUtils.js';

interface EventDetailProps {
  event: HookEvent | null;
  height?: number;
  width?: number;
  basePath?: string;
}

export const EventDetail: React.FC<EventDetailProps> = ({ event, height = 8, width = 80, basePath }) => {
  if (!event) {
    return (
      <Box borderStyle="single" borderColor={inkColors.border} paddingX={1} height={height} width={width} flexDirection="column">
        <Text dimColor>No event selected</Text>
      </Box>
    );
  }

  const renderToolEvent = () => {
    if (event.eventType !== 'PreToolUse' && event.eventType !== 'PostToolUse') {
      return null;
    }

    const toolName = 'toolName' in event ? event.toolName : 'Unknown';
    const toolInput = 'toolInput' in event ? formatToolInput(event.toolInput as Record<string, unknown>, basePath) : '{}';
    const duration = event.eventType === 'PostToolUse' && 'duration' in event && event.duration
      ? `${event.duration}ms`
      : null;

    const hookCommand = 'hookCommand' in event ? event.hookCommand : null;
    const hookOutput = 'hookOutput' in event ? event.hookOutput : null;
    const hookExitCode = 'hookExitCode' in event ? event.hookExitCode : null;

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={inkColors.info}>Tool:</Text> {toolName}
          {duration && <Text dimColor> ({duration})</Text>}
        </Text>

        {hookExitCode !== null && hookExitCode !== undefined && (
          <Text>
            <Text bold color={inkColors.info}>Hook Exit Code:</Text>{' '}
            <Text color={hookExitCode === 0 ? inkColors.success : inkColors.error}>
              {hookExitCode}
            </Text>
          </Text>
        )}

        {hookCommand && (
          <Box flexDirection="column">
            <Text bold color={inkColors.info}>Hook Command:</Text>
            <Text dimColor wrap="wrap">{hookCommand}</Text>
          </Box>
        )}

        {hookOutput && (
          <Box flexDirection="column" marginTop={1}>
            <Text bold color={inkColors.info}>Hook Output:</Text>
            <Text dimColor wrap="wrap">{hookOutput}</Text>
          </Box>
        )}

        <Box flexDirection="column" marginTop={1}>
          <Text bold color={inkColors.info}>Input:</Text>
          <Text dimColor wrap="wrap">{toolInput}</Text>
        </Box>
      </Box>
    );
  };

  const renderUserPrompt = () => {
    if (event.eventType !== 'UserPromptSubmit') return null;

    const prompt = 'prompt' in event ? event.prompt : '';

    return (
      <Box flexDirection="column">
        <Text bold color={inkColors.info}>User Prompt:</Text>
        <Text wrap="wrap">{prompt}</Text>
      </Box>
    );
  };

  const renderNotification = () => {
    if (event.eventType !== 'Notification') return null;

    const notifType = 'notificationType' in event ? event.notificationType : '';
    const message = 'message' in event ? event.message : '';

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={inkColors.info}>Type:</Text> {notifType}
        </Text>
        <Box flexDirection="column">
          <Text bold color={inkColors.info}>Message:</Text>
          <Text wrap="wrap">{message}</Text>
        </Box>
      </Box>
    );
  };

  const renderSessionEvent = () => {
    if (event.eventType !== 'SessionStart' && event.eventType !== 'SessionEnd') return null;

    const displayCwd = event.cwd ? makePathRelative(event.cwd, basePath) : '';

    return (
      <Box flexDirection="column">
        <Text>
          <Text bold color={inkColors.info}>Session ID:</Text> <Text dimColor>{event.sessionId}</Text>
        </Text>
        {displayCwd && (
          <Box flexDirection="column">
            <Text bold color={inkColors.info}>Working Directory:</Text>
            <Text wrap="wrap">{displayCwd}</Text>
          </Box>
        )}
      </Box>
    );
  };

  const renderStopEvent = () => {
    if (event.eventType !== 'Stop' && event.eventType !== 'SubagentStop') return null;

    const reason = 'reason' in event && event.reason ? event.reason : 'No reason provided';

    return (
      <Box flexDirection="column">
        <Text bold color={inkColors.info}>Reason:</Text>
        <Text wrap="wrap">{reason}</Text>
      </Box>
    );
  };

  return (
    <Box borderStyle="single" borderColor={inkColors.border} paddingX={1} flexDirection="column" height={height} width={width} overflow="hidden">
      {/* Header */}
      <Box marginBottom={1}>
        <Text>
          <Text bold color={inkColors.borderAccent}>[{event.eventType}]</Text>
          <Text dimColor> {formatAbsoluteTime(event.timestamp)}</Text>
        </Text>
      </Box>

      {/* Content based on event type - scrollable content */}
      <Box flexDirection="column" flexGrow={1} overflow="hidden">
        {renderToolEvent()}
        {renderUserPrompt()}
        {renderNotification()}
        {renderSessionEvent()}
        {renderStopEvent()}
      </Box>
    </Box>
  );
};
