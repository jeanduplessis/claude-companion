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
    if (event.eventType !== 'ToolUse') {
      return null;
    }

    const toolName = 'toolName' in event ? event.toolName : 'Unknown';
    const toolInput = 'toolInput' in event ? (event.toolInput as Record<string, unknown>) : {};
    const duration = 'duration' in event && event.duration
      ? `${event.duration}ms`
      : null;

    const hookCommand = 'hookCommand' in event ? event.hookCommand : null;
    const hookOutput = 'hookOutput' in event ? event.hookOutput : null;
    const hookExitCode = 'hookExitCode' in event ? event.hookExitCode : null;

    // Smart formatting based on tool type
    const renderToolInput = () => {
      // Edit tool - show file path and diff
      if (toolName === 'Edit' && 'file_path' in toolInput) {
        const filePath = makePathRelative(toolInput.file_path as string, basePath);
        const oldString = toolInput.old_string ? String(toolInput.old_string) : '';
        const newString = toolInput.new_string ? String(toolInput.new_string) : '';
        const replaceAll = toolInput.replace_all ? ' (replace all)' : '';

        // Generate simple line-by-line diff
        const oldLines = oldString.split('\n');
        const newLines = newString.split('\n');

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>File:</Text> {filePath}{replaceAll && <Text dimColor>{replaceAll}</Text>}</Text>

            <Box flexDirection="column" marginTop={1}>
              <Text bold color={inkColors.info}>Diff:</Text>
              {oldLines.map((line, i) => (
                <Text key={`old-${i}`} color={inkColors.error}>- {line}</Text>
              ))}
              {newLines.map((line, i) => (
                <Text key={`new-${i}`} color={inkColors.success}>+ {line}</Text>
              ))}
            </Box>
          </Box>
        );
      }

      // Write - show file path and content preview
      if (toolName === 'Write' && 'file_path' in toolInput) {
        const filePath = makePathRelative(toolInput.file_path as string, basePath);
        const content = toolInput.content ? String(toolInput.content) : '';
        const lines = content.split('\n').length;

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>File:</Text> {filePath}</Text>
            <Text dimColor>{lines} line(s)</Text>

            {content && (
              <Box flexDirection="column" marginTop={1}>
                <Text bold color={inkColors.success}>Content:</Text>
                <Text dimColor wrap="wrap">{content}</Text>
              </Box>
            )}
          </Box>
        );
      }

      // Read - show file path and read parameters
      if (toolName === 'Read' && 'file_path' in toolInput) {
        const filePath = makePathRelative(toolInput.file_path as string, basePath);
        const offset = toolInput.offset ? ` offset=${toolInput.offset}` : '';
        const limit = toolInput.limit ? ` limit=${toolInput.limit}` : '';

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>File:</Text> {filePath}</Text>
            {(offset || limit) && <Text dimColor>{offset}{limit}</Text>}
          </Box>
        );
      }

      // Bash - show command and description
      if (toolName === 'Bash' && 'command' in toolInput) {
        const command = String(toolInput.command);
        const description = toolInput.description ? String(toolInput.description) : '';

        return (
          <Box flexDirection="column">
            {description && <Text dimColor>{description}</Text>}
            <Text bold color={inkColors.info}>Command:</Text>
            <Text dimColor wrap="wrap">{command}</Text>
          </Box>
        );
      }

      // Grep - show pattern and parameters
      if (toolName === 'Grep') {
        const pattern = toolInput.pattern ? String(toolInput.pattern) : '';
        const path = toolInput.path ? makePathRelative(String(toolInput.path), basePath) : '';
        const glob = toolInput.glob ? String(toolInput.glob) : '';
        const outputMode = toolInput.output_mode ? String(toolInput.output_mode) : 'files_with_matches';
        const caseInsensitive = toolInput['-i'] ? ' (case insensitive)' : '';

        return (
          <Box flexDirection="column">
            {pattern && <Text><Text bold color={inkColors.info}>Pattern:</Text> {pattern}{caseInsensitive}</Text>}
            {path && <Text><Text bold color={inkColors.info}>Path:</Text> {path}</Text>}
            {glob && <Text><Text bold color={inkColors.info}>Glob:</Text> {glob}</Text>}
            <Text dimColor>Mode: {outputMode}</Text>
          </Box>
        );
      }

      // Glob - show pattern
      if (toolName === 'Glob' && 'pattern' in toolInput) {
        const pattern = String(toolInput.pattern);
        const path = toolInput.path ? makePathRelative(String(toolInput.path), basePath) : '';

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>Pattern:</Text> {pattern}</Text>
            {path && <Text><Text bold color={inkColors.info}>Path:</Text> {path}</Text>}
          </Box>
        );
      }

      // WebFetch - show URL
      if (toolName === 'WebFetch' && 'url' in toolInput) {
        const url = String(toolInput.url);
        const prompt = toolInput.prompt ? String(toolInput.prompt) : '';

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>URL:</Text></Text>
            <Text dimColor wrap="wrap">{url}</Text>
            {prompt && (
              <>
                <Text bold color={inkColors.info}>Prompt:</Text>
                <Text dimColor wrap="wrap">{prompt}</Text>
              </>
            )}
          </Box>
        );
      }

      // WebSearch - show query and domain filters
      if (toolName === 'WebSearch' && 'query' in toolInput) {
        const query = String(toolInput.query);
        const allowedDomains = toolInput.allowed_domains as string[] | undefined;
        const blockedDomains = toolInput.blocked_domains as string[] | undefined;

        return (
          <Box flexDirection="column">
            <Text><Text bold color={inkColors.info}>Query:</Text> {query}</Text>
            {allowedDomains && allowedDomains.length > 0 && (
              <Text dimColor>Allowed domains: {allowedDomains.join(', ')}</Text>
            )}
            {blockedDomains && blockedDomains.length > 0 && (
              <Text dimColor>Blocked domains: {blockedDomains.join(', ')}</Text>
            )}
          </Box>
        );
      }

      // Default - show JSON for other tools
      return (
        <Text dimColor wrap="wrap">{formatToolInput(toolInput, basePath)}</Text>
      );
    };

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
          {renderToolInput()}
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
