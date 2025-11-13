import React from 'react';
import { Box, Text, useApp, useInput } from 'ink';
import { inkColors } from '../theme/colors.js';

interface SetupPromptProps {
  onRunSetup: () => void;
  onContinueAnyway: () => void;
}

export const SetupPrompt: React.FC<SetupPromptProps> = ({ onRunSetup, onContinueAnyway }) => {
  const { exit } = useApp();

  useInput((input) => {
    if (input === 'y' || input === 'Y') {
      onRunSetup();
    } else if (input === 'n' || input === 'N') {
      onContinueAnyway();
    } else if (input === 'q' || input === 'Q') {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box borderStyle="double" borderColor={inkColors.warning} paddingX={2} paddingY={1} marginBottom={1}>
        <Text bold color={inkColors.warning}>
          ⚠ Claude Code Hooks Not Configured
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text>
          Claude Companion needs hooks to be configured in Claude Code to receive events.
        </Text>
      </Box>

      <Box flexDirection="column" marginY={1} paddingX={1}>
        <Text bold color={inkColors.text}>Without hooks configured:</Text>
        <Text>  • No events will be captured</Text>
        <Text>  • The monitor will show "No active sessions"</Text>
        <Text>  • You won't see any hook activity</Text>
      </Box>

      <Box
        borderStyle="single"
        borderColor={inkColors.info}
        paddingX={2}
        paddingY={1}
        marginY={1}
      >
        <Box flexDirection="column">
          <Text bold color={inkColors.info}>
            Would you like to run the setup wizard now?
          </Text>
          <Box marginTop={1}>
            <Text color={inkColors.dim}>
              The wizard will guide you through configuring hooks automatically.
            </Text>
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" paddingX={1} marginTop={1}>
        <Text>
          <Text bold color={inkColors.success}>
            [Y]
          </Text>{' '}
          Yes, run setup wizard
        </Text>
        <Text>
          <Text bold color={inkColors.info}>
            [N]
          </Text>{' '}
          No, continue anyway (monitor will wait for events)
        </Text>
        <Text>
          <Text bold color={inkColors.error}>
            [Q]
          </Text>{' '}
          Quit
        </Text>
      </Box>

      <Box marginTop={1} paddingX={1}>
        <Text color={inkColors.dim}>
          💡 Tip: You can also run{' '}
          <Text bold>claude-companion setup</Text> manually at any time.
        </Text>
      </Box>
    </Box>
  );
};
