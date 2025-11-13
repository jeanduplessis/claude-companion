import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { GitFile } from '../git/GitClient.js';
import { parseDiff, formatLineNumbers, DiffLine } from '../git/diffParser.js';
import { inkColors, catppuccin } from '../theme/colors.js';

interface DiffViewerProps {
  file: GitFile | null;
  getDiff: (file: GitFile) => Promise<string | null>;
  scrollOffset?: number;
  height: number;
  width?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  file,
  getDiff,
  scrollOffset = 0,
  height,
  width
}) => {
  const [diffContent, setDiffContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch diff when file changes
  useEffect(() => {
    if (!file) {
      setDiffContent(null);
      setError(null);
      return;
    }

    let cancelled = false;

    const fetchDiff = async () => {
      setLoading(true);
      setError(null);
      try {
        const diff = await getDiff(file);
        // Only update state if this effect hasn't been cancelled
        if (!cancelled) {
          setDiffContent(diff);
        }
      } catch (err) {
        console.error('Error fetching diff:', err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load diff');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchDiff();

    // Cleanup function to prevent state updates after unmount/file change
    return () => {
      cancelled = true;
    };
  }, [file, getDiff]);

  // Render empty state
  if (!file) {
    return (
      <Box
        borderStyle="single"
        borderColor={inkColors.border}
        paddingX={1}
        flexDirection="column"
        height={height}
        width={width}
        overflow="hidden"
      >
        <Text dimColor>Select a file to view diff</Text>
      </Box>
    );
  }

  // Render loading state
  if (loading) {
    return (
      <Box
        borderStyle="single"
        borderColor={inkColors.border}
        paddingX={1}
        flexDirection="column"
        height={height}
        width={width}
        overflow="hidden"
      >
        <Text dimColor>Loading diff...</Text>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box
        borderStyle="single"
        borderColor={inkColors.border}
        paddingX={1}
        flexDirection="column"
        height={height}
        width={width}
        overflow="hidden"
      >
        <Text color={inkColors.error}>{error}</Text>
      </Box>
    );
  }

  // Render no diff content
  if (!diffContent) {
    return (
      <Box
        borderStyle="single"
        borderColor={inkColors.border}
        paddingX={1}
        flexDirection="column"
        height={height}
        width={width}
        overflow="hidden"
      >
        <Text dimColor>No diff available</Text>
      </Box>
    );
  }

  // Check if it's a simple message (not a unified diff)
  if (!diffContent.includes('@@') && !diffContent.includes('diff --git')) {
    return (
      <Box
        borderStyle="single"
        borderColor={inkColors.border}
        paddingX={1}
        flexDirection="column"
        height={height}
        width={width}
        overflow="hidden"
      >
        <Box marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>{file.path}</Text>
        </Box>
        <Text color={inkColors.dim}>{diffContent}</Text>
      </Box>
    );
  }

  // Parse diff into structured lines
  const diffLines = parseDiff(diffContent);

  // Apply scrollOffset (for Phase 2 scrolling)
  const visibleLines = diffLines.slice(scrollOffset, scrollOffset + (height - 3));

  return (
    <Box
      borderStyle="single"
      borderColor={inkColors.border}
      paddingX={1}
      flexDirection="column"
      height={height}
      width={width}
      overflow="hidden"
    >
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          {file.path} [{file.status}] {file.staged ? '(staged)' : '(unstaged)'}
        </Text>
      </Box>

      {/* Diff content */}
      <Box flexDirection="column" flexGrow={1}>
        {visibleLines.map((line, index) => (
          <DiffLineComponent key={`${scrollOffset + index}`} line={line} />
        ))}
      </Box>

      {/* Scroll indicator (if needed) */}
      {diffLines.length > (height - 3) && (
        <Box>
          <Text dimColor>
            Lines {scrollOffset + 1}-{Math.min(scrollOffset + height - 3, diffLines.length)} of {diffLines.length}
          </Text>
        </Box>
      )}
    </Box>
  );
};

/**
 * Render a single diff line with appropriate formatting
 */
const DiffLineComponent: React.FC<{ line: DiffLine }> = ({ line }) => {
  const lineNumbers = formatLineNumbers(line);

  switch (line.type) {
    case 'header':
      return (
        <Box>
          <Text dimColor>{line.content}</Text>
        </Box>
      );

    case 'hunk':
      return (
        <Box>
          <Text color={catppuccin.blue}>{line.content}</Text>
        </Box>
      );

    case 'add':
      return (
        <Box>
          <Text dimColor>{lineNumbers}</Text>
          <Text color={catppuccin.green}> +{line.content}</Text>
        </Box>
      );

    case 'delete':
      return (
        <Box>
          <Text dimColor>{lineNumbers}</Text>
          <Text color={catppuccin.red}> -{line.content}</Text>
        </Box>
      );

    case 'context':
      return (
        <Box>
          <Text dimColor>{lineNumbers}</Text>
          <Text dimColor>  {line.content}</Text>
        </Box>
      );

    default:
      return (
        <Box>
          <Text>{line.content}</Text>
        </Box>
      );
  }
};
