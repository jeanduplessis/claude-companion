import React from 'react';
import { Box, Text } from 'ink';
import { inkColors } from '../../theme/colors.js';

export const ContextWindowView: React.FC = () => {
  return (
    <Box flexDirection="column" flexGrow={1} padding={2}>
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Context Window
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text color={inkColors.dim}>
          This view will show Claude Code's context window usage and token statistics.
        </Text>
        <Box marginTop={1}>
          <Text color={inkColors.dim}>
            Coming soon...
          </Text>
        </Box>
      </Box>
    </Box>
  );
};
