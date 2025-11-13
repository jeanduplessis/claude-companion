import React from 'react';
import { Box, Text } from 'ink';
import { inkColors } from '../../theme/colors.js';

export const GitView: React.FC = () => {
  return (
    <Box flexDirection="column" flexGrow={1} padding={2}>
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Git Status
        </Text>
      </Box>
      <Box flexDirection="column">
        <Text color={inkColors.dim}>
          This view will show git repository status, uncommitted changes, and branch information.
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
