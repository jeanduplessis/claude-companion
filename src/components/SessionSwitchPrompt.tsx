import React from 'react';
import { Box, Text } from 'ink';
import { Session } from '../types/events.js';
import { inkColors } from '../theme/colors.js';

interface SessionSwitchPromptProps {
  currentSession: Session;
  newSession: Session;
}

export const SessionSwitchPrompt: React.FC<SessionSwitchPromptProps> = ({
  currentSession,
  newSession
}) => {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={inkColors.warning}
      paddingX={2}
      paddingY={1}
      marginY={1}
    >
      <Box marginBottom={1}>
        <Text bold color={inkColors.warning}>
          New Claude Code Session Detected!
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text color={inkColors.dim}>
          Current session: <Text bold color={inkColors.text}>{currentSession.sessionId.substring(0, 8)}...</Text>
        </Text>
        <Text color={inkColors.dim}>
          New session: <Text bold color={inkColors.success}>{newSession.sessionId.substring(0, 8)}...</Text>
        </Text>
      </Box>

      <Box>
        <Text>
          Press <Text bold color={inkColors.success}>s</Text> to switch to new session or{' '}
          <Text bold color={inkColors.dim}>i</Text> to ignore
        </Text>
      </Box>
    </Box>
  );
};
