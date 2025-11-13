import React from 'react';
import { Box, Text } from 'ink';
import { GitFile } from '../git/GitClient.js';
import { colors, inkColors } from '../theme/colors.js';

interface GitFileListProps {
  stagedFiles: GitFile[];
  unstagedFiles: GitFile[];
  untrackedFiles: GitFile[];
  selectedIndex: number;
  maxHeight?: number;
}

export const GitFileList: React.FC<GitFileListProps> = ({
  stagedFiles,
  unstagedFiles,
  untrackedFiles,
  selectedIndex,
  maxHeight = 20
}) => {
  // Build array with section info
  const allFilesWithSection: Array<{ file: GitFile; section: 'staged' | 'unstaged' | 'untracked' }> = [
    ...stagedFiles.map(file => ({ file, section: 'staged' as const })),
    ...unstagedFiles.map(file => ({ file, section: 'unstaged' as const })),
    ...untrackedFiles.map(file => ({ file, section: 'untracked' as const }))
  ];

  // Get color based on section (to match header colors)
  const getSectionColor = (section: 'staged' | 'unstaged' | 'untracked') => {
    switch (section) {
      case 'staged': return colors.success;      // Green - matches "Staged" count
      case 'unstaged': return colors.warning;    // Yellow - matches "Unstaged" count
      case 'untracked': return colors.info;      // Blue - matches "Untracked" count
    }
  };

  // Get status symbol
  const getStatusSymbol = (status: string): string => {
    switch (status) {
      case 'A': return '+';  // Added
      case 'M': return '~';  // Modified
      case 'D': return '-';  // Deleted
      case 'R': return '»';  // Renamed
      default: return '•';   // Other
    }
  };

  // Build elements array with headers
  const elements: React.ReactElement[] = [];
  let fileIndex = 0;

  // Staged section
  if (stagedFiles.length > 0) {
    elements.push(<Text key="staged-header" bold color={inkColors.success}>Staged Changes:</Text>);
    for (let i = 0; i < stagedFiles.length; i++) {
      const isSelected = fileIndex === selectedIndex;
      const prefix = isSelected ? '→' : ' ';
      const symbol = getStatusSymbol(stagedFiles[i].status);
      const statusText = colors.success(symbol);
      elements.push(<Text key={`staged-${i}`}>{prefix} {statusText} {stagedFiles[i].path}</Text>);
      fileIndex++;
    }
  }

  // Unstaged section
  if (unstagedFiles.length > 0) {
    if (elements.length > 0) {
      elements.push(<Text key="unstaged-spacer"> </Text>);
    }
    elements.push(<Text key="unstaged-header" bold color={inkColors.warning}>Unstaged Changes:</Text>);
    for (let i = 0; i < unstagedFiles.length; i++) {
      const isSelected = fileIndex === selectedIndex;
      const prefix = isSelected ? '→' : ' ';
      const symbol = getStatusSymbol(unstagedFiles[i].status);
      const statusText = colors.warning(symbol);
      elements.push(<Text key={`unstaged-${i}`}>{prefix} {statusText} {unstagedFiles[i].path}</Text>);
      fileIndex++;
    }
  }

  // Untracked section
  if (untrackedFiles.length > 0) {
    if (elements.length > 0) {
      elements.push(<Text key="untracked-spacer"> </Text>);
    }
    elements.push(<Text key="untracked-header" bold color={inkColors.info}>Untracked Files:</Text>);
    for (let i = 0; i < untrackedFiles.length; i++) {
      const isSelected = fileIndex === selectedIndex;
      const prefix = isSelected ? '→' : ' ';
      const symbol = getStatusSymbol(untrackedFiles[i].status);
      const statusText = colors.info(symbol);
      elements.push(<Text key={`untracked-${i}`}>{prefix} {statusText} {untrackedFiles[i].path}</Text>);
      fileIndex++;
    }
  }

  // Return array of Text components directly
  return <>{elements}</>;
};
