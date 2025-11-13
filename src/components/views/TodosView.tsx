import React from 'react';
import { Box, Text } from 'ink';
import { HookEvent } from '../../types/events.js';
import { extractLatestTodos, countTodosByStatus } from '../../utils/todoExtractor.js';
import { formatAbsoluteTime } from '../../utils/formatters.js';
import { inkColors } from '../../theme/colors.js';

interface TodosViewProps {
  events: HookEvent[];
}

export const TodosView: React.FC<TodosViewProps> = ({ events }) => {
  const snapshot = extractLatestTodos(events);

  // Empty state when no TodoWrite events exist
  if (!snapshot) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={2}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Todos
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={inkColors.dim}>
            No todos yet
          </Text>
          <Box marginTop={1}>
            <Text color={inkColors.dim}>
              Todos will appear when Claude Code uses the TodoWrite tool
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const { todos, lastUpdated } = snapshot;
  const counts = countTodosByStatus(todos);

  // Calculate progress percentage
  const progressPercentage = todos.length > 0
    ? Math.round((counts.completed / todos.length) * 100)
    : 0;

  // Generate progress bar
  const progressBarWidth = 30;
  const filledWidth = Math.round((progressPercentage / 100) * progressBarWidth);
  const emptyWidth = progressBarWidth - filledWidth;
  const progressBar = '━'.repeat(filledWidth) + '░'.repeat(emptyWidth);

  // Helper to get status indicator symbol
  const getStatusIndicator = (status: string): string => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '→';
      case 'pending':
        return '○';
      default:
        return '·';
    }
  };

  // Helper to get status color
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return inkColors.success;
      case 'in_progress':
        return inkColors.info;
      case 'pending':
        return inkColors.dim;
      default:
        return inkColors.text;
    }
  };

  return (
    <Box flexDirection="column" flexGrow={1} padding={2}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Todos
        </Text>
      </Box>

      {/* Progress Bar */}
      <Box marginBottom={1} flexDirection="column">
        <Box>
          <Text color={inkColors.success}>{progressBar}</Text>
          <Text color={inkColors.text}> {progressPercentage}%</Text>
        </Box>
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color={inkColors.border}>{'─'.repeat(50)}</Text>
      </Box>

      {/* Todo List */}
      <Box flexDirection="column" marginBottom={1}>
        {todos.map((todo, index) => {
          const indicator = getStatusIndicator(todo.status);
          const color = getStatusColor(todo.status);
          const isInProgress = todo.status === 'in_progress';

          return (
            <Box key={`${todo.content}-${index}`} marginBottom={0}>
              <Text color={color} bold={isInProgress}>
                {indicator} {todo.content}
              </Text>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Box marginBottom={1}>
        <Text color={inkColors.border}>{'─'.repeat(50)}</Text>
      </Box>

      {/* Metadata Bar (moved to bottom) */}
      <Box flexDirection="column">
        <Box marginBottom={0}>
          <Text color={inkColors.dim}>Last updated: </Text>
          <Text color={inkColors.text}>{formatAbsoluteTime(lastUpdated)}</Text>
        </Box>
        <Box>
          <Text color={inkColors.dim}>Total: </Text>
          <Text color={inkColors.text}>{todos.length}</Text>
          <Text color={inkColors.dim}> | </Text>
          <Text color={inkColors.success}>✓ {counts.completed}</Text>
          <Text color={inkColors.dim}> | </Text>
          <Text color={inkColors.dim}>○ {counts.pending}</Text>
        </Box>
      </Box>
    </Box>
  );
};
