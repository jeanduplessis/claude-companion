import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../../types/events.js';
import { ConnectionStatus } from '../../state/useEvents.js';
import { inkColors } from '../../theme/colors.js';

interface DashboardViewProps {
  session: Session | null;
  connectionStatus: ConnectionStatus;
  eventCount: number;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  session,
  connectionStatus,
  eventCount
}) => {
  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return inkColors.success;
      case 'connecting':
        return inkColors.warning;
      case 'error':
        return inkColors.error;
      case 'disconnected':
        return inkColors.dim;
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Error';
      case 'disconnected':
        return 'Disconnected';
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1} padding={2}>
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Dashboard
        </Text>
      </Box>

      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.text}>Session Overview</Text>
        </Box>

        <Box flexDirection="column" paddingLeft={2}>
          <Box>
            <Text color={inkColors.dim}>Status: </Text>
            <Text color={getStatusColor()}>{getStatusText()}</Text>
          </Box>

          {session && (
            <>
              <Box>
                <Text color={inkColors.dim}>Session ID: </Text>
                <Text color={inkColors.text}>{session.sessionId.slice(0, 12)}...</Text>
              </Box>

              {session.metadata?.cwd && (
                <Box>
                  <Text color={inkColors.dim}>Working Directory: </Text>
                  <Text color={inkColors.text}>{session.metadata.cwd}</Text>
                </Box>
              )}

              {session.metadata?.pid && (
                <Box>
                  <Text color={inkColors.dim}>Process ID: </Text>
                  <Text color={inkColors.text}>{session.metadata.pid}</Text>
                </Box>
              )}

              <Box>
                <Text color={inkColors.dim}>Total Events: </Text>
                <Text color={inkColors.text}>{eventCount}</Text>
              </Box>
            </>
          )}
        </Box>
      </Box>

      <Box flexDirection="column" paddingY={1}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.text}>Available Views</Text>
        </Box>

        <Box flexDirection="column" paddingLeft={2}>
          <Box>
            <Text color={inkColors.dim}>• </Text>
            <Text bold color={inkColors.borderAccent}>Hooks</Text>
            <Text color={inkColors.dim}> (press </Text>
            <Text bold>h</Text>
            <Text color={inkColors.dim}>): Monitor real-time hook events from Claude Code</Text>
          </Box>

          <Box>
            <Text color={inkColors.dim}>• </Text>
            <Text bold color={inkColors.borderAccent}>Context Window</Text>
            <Text color={inkColors.dim}> (press </Text>
            <Text bold>w</Text>
            <Text color={inkColors.dim}>): View context window usage and token statistics</Text>
          </Box>

          <Box>
            <Text color={inkColors.dim}>• </Text>
            <Text bold color={inkColors.borderAccent}>Git</Text>
            <Text color={inkColors.dim}> (press </Text>
            <Text bold>g</Text>
            <Text color={inkColors.dim}>): View git repository status and changes</Text>
          </Box>

          <Box>
            <Text color={inkColors.dim}>• </Text>
            <Text bold color={inkColors.borderAccent}>Todos</Text>
            <Text color={inkColors.dim}> (press </Text>
            <Text bold>t</Text>
            <Text color={inkColors.dim}>): Track Claude Code's todo list and progress</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color={inkColors.dim}>Press the shortcut keys to navigate between views</Text>
      </Box>
    </Box>
  );
};
