import React from 'react';
import { Box, Text } from 'ink';
import { VIEW_TABS } from '../types/navigation.js';
import { inkColors } from '../theme/colors.js';

export const HelpScreen: React.FC = () => {
  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={inkColors.borderAccent}
      padding={1}
    >
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>Claude Commander - Help</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={inkColors.success}>Navigation:</Text>
        {VIEW_TABS.map(tab => (
          <Box key={tab.id}>
            <Text color={inkColors.borderAccent} bold>{tab.shortcut}</Text>
            <Text>: {tab.label}</Text>
          </Box>
        ))}
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={inkColors.success}>Dashboard View:</Text>
        <Text dimColor>  View session overview and statistics</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={inkColors.success}>Hooks View:</Text>
        <Text dimColor>  ↑↓: scroll through events</Text>
        <Text dimColor>  f: toggle filters</Text>
        <Text dimColor>  c: clear events</Text>
        <Text dimColor>  r: reset filters</Text>
        <Text dimColor>  1-6: toggle event types</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={inkColors.success}>Git View:</Text>
        <Text dimColor>  ↑↓: select file</Text>
        <Text dimColor>  Enter: stage/unstage file</Text>
        <Text dimColor>  Shift+A: stage all files</Text>
        <Text dimColor>  Shift+C: commit staged files</Text>
        <Text dimColor>  PgUp/PgDn: scroll diff</Text>
        <Text dimColor>  r: refresh status</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold color={inkColors.success}>Global:</Text>
        <Text dimColor>  ?: show this help</Text>
        <Text dimColor>  q or Ctrl+C: quit</Text>
      </Box>

      <Box marginTop={1}>
        <Text color={inkColors.warning}>Press any key to close...</Text>
      </Box>
    </Box>
  );
};
