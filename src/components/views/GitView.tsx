import React, { useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { Session } from '../../types/events.js';
import { useGitData } from '../../state/useGitData.js';
import { DiffViewer } from '../DiffViewer.js';
import { GitFileList } from '../GitFileList.js';
import { CommitPrompt } from '../CommitPrompt.js';
import { GitFile } from '../../git/GitClient.js';
import { inkColors } from '../../theme/colors.js';

interface GitViewProps {
  session: Session | null;
  terminalWidth?: number;
  onModalStateChange?: (isOpen: boolean) => void;
}

export const GitView: React.FC<GitViewProps> = ({ session, terminalWidth = 80, onModalStateChange }) => {
  const { stdout } = useStdout();
  const cwd = session?.metadata?.cwd || null;
  const { data, refresh, getDiff, stageFile, unstageFile, stageAllFiles, commit } = useGitData(cwd);

  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [diffScrollOffset, setDiffScrollOffset] = useState(0);
  const [showCommitPrompt, setShowCommitPrompt] = useState(false);

  // Notify parent when commit prompt state changes
  React.useEffect(() => {
    onModalStateChange?.(showCommitPrompt);
  }, [showCommitPrompt, onModalStateChange]);

  // Combine all files into a single array for selection
  const allFiles: GitFile[] = [...data.stagedFiles, ...data.unstagedFiles, ...data.untrackedFiles];
  const selectedFile = allFiles[selectedFileIndex] || null;

  // Calculate dynamic heights based on terminal size
  const terminalHeight = stdout?.rows || 24;
  const headerHeight = 2; // Git status header
  const statusMessageHeight = 0; // No status message

  // Calculate file list height: files + section headers + margins between sections + borders
  const sectionCount = (data.stagedFiles.length > 0 ? 1 : 0) +
                       (data.unstagedFiles.length > 0 ? 1 : 0) +
                       (data.untrackedFiles.length > 0 ? 1 : 0);
  const marginCount = Math.max(0, sectionCount - 1); // Margins between sections
  const fileListContentHeight = allFiles.length + sectionCount + marginCount + 2; // +2 for padding
  const fileListHeight = Math.min(35, fileListContentHeight);

  const fixedHeight = headerHeight + statusMessageHeight + fileListHeight;
  const diffViewerHeight = Math.max(10, terminalHeight - fixedHeight);

  // Handle staging/unstaging
  const handleEnter = async () => {
    if (!selectedFile) return;

    try {
      // Extract actual file path (handle renamed files)
      let filePath = selectedFile.path;
      if (selectedFile.status === 'R') {
        const match = selectedFile.path.match(/→\s+(.+)$/);
        if (match) {
          filePath = match[1];
        }
      }

      if (selectedFile.staged) {
        // Unstage the file
        await unstageFile(filePath);
      } else {
        // Stage the file (works for both untracked and unstaged)
        await stageFile(filePath);
      }
    } catch (error) {
      console.error('Failed to stage/unstage file:', error);
    }
  };

  // Handle staging all files (Shift+A)
  const handleStageAll = async () => {
    try {
      // Stage all unstaged and untracked files
      const filesToStage = [...data.unstagedFiles, ...data.untrackedFiles];

      // Extract file paths, handling renamed files
      const filePaths = filesToStage.map(file => {
        let filePath = file.path;
        // Handle renamed files
        if (file.status === 'R') {
          const match = file.path.match(/→\s+(.+)$/);
          if (match) {
            filePath = match[1];
          }
        }
        return filePath;
      });

      // Stage all at once (single refresh)
      await stageAllFiles(filePaths);
    } catch (error) {
      console.error('Failed to stage all files:', error);
    }
  };

  // Handle commit
  const handleCommit = async (message: string) => {
    try {
      await commit(message);
      setShowCommitPrompt(false);
    } catch (error) {
      console.error('Failed to commit:', error);
      // Keep prompt open on error so user can try again
    }
  };

  const handleCancelCommit = () => {
    setShowCommitPrompt(false);
  };

  // Keyboard navigation - disabled when commit prompt is showing
  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedFileIndex(prev => Math.max(0, prev - 1));
      setDiffScrollOffset(0); // Reset scroll when changing files
    } else if (key.downArrow) {
      setSelectedFileIndex(prev => Math.min(allFiles.length - 1, prev + 1));
      setDiffScrollOffset(0); // Reset scroll when changing files
    } else if (key.pageUp) {
      setDiffScrollOffset(prev => Math.max(0, prev - 10));
    } else if (key.pageDown) {
      setDiffScrollOffset(prev => prev + 10);
    } else if (key.return) {
      handleEnter();
    } else if (input === 'r') {
      refresh();
    } else if (input === 'A' && key.shift) {
      handleStageAll();
    } else if (input === 'C' && key.shift) {
      // Only show commit prompt if there are staged files
      if (data.stagedFiles.length > 0) {
        setShowCommitPrompt(true);
      }
    }
  }, { isActive: !showCommitPrompt });

  // Error state - not a git repo
  if (data.error && !data.isRepo) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={2}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.warning}>
            Git Status
          </Text>
        </Box>
        <Box flexDirection="column">
          <Text color={inkColors.error}>{data.error}</Text>
          {cwd && (
            <Box marginTop={1}>
              <Text dimColor>Directory: {cwd}</Text>
            </Box>
          )}
          <Box marginTop={1}>
            <Text dimColor>Press 'r' to retry</Text>
          </Box>
        </Box>
      </Box>
    );
  }

  // Loading state
  if (data.loading) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={2}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Git Status
          </Text>
        </Box>
        <Text dimColor>Loading git status...</Text>
      </Box>
    );
  }

  // No session
  if (!cwd) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={2}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Git Status
          </Text>
        </Box>
        <Text dimColor>No session active</Text>
      </Box>
    );
  }

  // No changes
  if (allFiles.length === 0) {
    return (
      <Box flexDirection="column" flexGrow={1} padding={2}>
        <Box marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Git Status
          </Text>
        </Box>
        {data.branch && (
          <Box marginBottom={1}>
            <Text>Branch: <Text bold>{data.branch}</Text></Text>
          </Box>
        )}
        <Text color={inkColors.success}>Working tree clean - no changes</Text>
        <Box marginTop={1}>
          <Text dimColor>Press 'r' to refresh</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" flexGrow={1}>
      {/* Git status header */}
      <Box borderStyle="single" borderColor={inkColors.border} paddingX={1}>
        <Text>
          Branch: <Text bold color={inkColors.borderAccent}>{data.branch || 'unknown'}</Text>
          {' | '}
          Staged: <Text bold color={inkColors.success}>{data.stagedFiles.length}</Text>
          {' | '}
          Unstaged: <Text bold color={inkColors.warning}>{data.unstagedFiles.length}</Text>
          {' | '}
          Untracked: <Text bold color={inkColors.info}>{data.untrackedFiles.length}</Text>
        </Text>
      </Box>

      {/* File list - let it size naturally */}
      <Box flexDirection="column" flexShrink={0} paddingX={2}>
        <GitFileList
          stagedFiles={data.stagedFiles}
          unstagedFiles={data.unstagedFiles}
          untrackedFiles={data.untrackedFiles}
          selectedIndex={selectedFileIndex}
        />
      </Box>

      {/* Diff viewer */}
      <Box flexGrow={1}>
        <DiffViewer
          file={selectedFile}
          getDiff={getDiff}
          scrollOffset={diffScrollOffset}
          height={diffViewerHeight}
          width={terminalWidth}
        />
      </Box>

      {/* Commit prompt overlay */}
      {showCommitPrompt && (
        <Box
          position="absolute"
          width="100%"
          height="100%"
          justifyContent="center"
          alignItems="center"
        >
          <CommitPrompt
            onSubmit={handleCommit}
            onCancel={handleCancelCommit}
          />
        </Box>
      )}
    </Box>
  );
};
