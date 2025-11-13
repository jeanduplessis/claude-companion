import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { inkColors } from '../theme/colors.js';

interface CommitPromptProps {
  onSubmit: (message: string) => void;
  onCancel: () => void;
}

export const CommitPrompt: React.FC<CommitPromptProps> = ({ onSubmit, onCancel }) => {
  const [commitMessage, setCommitMessage] = useState('');

  // Handle Escape key to cancel
  useInput((input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    if (commitMessage.trim()) {
      onSubmit(commitMessage.trim());
    }
  };

  return (
    <Box
      flexDirection="column"
      borderStyle="double"
      borderColor={inkColors.borderAccent}
      padding={1}
      width="80%"
      backgroundColor="#1e1e2e"
    >
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>Commit Message</Text>
      </Box>

      <Box marginBottom={1}>
        <TextInput
          value={commitMessage}
          onChange={setCommitMessage}
          onSubmit={handleSubmit}
          placeholder="Enter commit message..."
        />
      </Box>

      <Box>
        <Text dimColor>Press Enter to commit, Esc to cancel</Text>
      </Box>
    </Box>
  );
};
