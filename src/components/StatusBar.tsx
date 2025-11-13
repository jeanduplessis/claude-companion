import React from 'react';
import { Box, Text } from 'ink';
import { ConnectionStatus } from '../state/useEvents.js';
import { Session } from '../types/events.js';
import { colors, inkColors } from '../theme/colors.js';

interface StatusBarProps {
  session: Session | null;
  connectionStatus: ConnectionStatus;
  eventCount: number;
  filteredCount: number;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  session,
  connectionStatus,
  eventCount,
  filteredCount
}) => {
  const getStatusIndicator = () => {
    switch (connectionStatus) {
      case 'connected':
        return colors.success('●');
      case 'connecting':
        return colors.warning('○');
      case 'error':
        return colors.error('✗');
      case 'disconnected':
        return colors.dim('○');
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return colors.success('Connected');
      case 'connecting':
        return colors.warning('Connecting...');
      case 'error':
        return colors.error('Error');
      case 'disconnected':
        return colors.dim('Disconnected');
    }
  };

  const sessionId = session?.sessionId ? session.sessionId.slice(0, 8) : 'None';
  const cwd = session?.metadata?.cwd ? ` (${session.metadata.cwd})` : '';

  return (
    <Box borderStyle="single" borderColor={inkColors.border} paddingX={1}>
      <Text>
        {getStatusIndicator()} {getStatusText()} | Session: <Text bold color={inkColors.text}>{sessionId}</Text>
        {cwd} | Events: <Text bold color={inkColors.text}>{filteredCount}</Text>
        {filteredCount !== eventCount && <Text color={inkColors.dim}> / {eventCount}</Text>}
      </Text>
    </Box>
  );
};
