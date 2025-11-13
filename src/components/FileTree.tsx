import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { GitFile } from '../git/GitClient.js';
import { colors, inkColors } from '../theme/colors.js';

interface FileTreeProps {
  files: GitFile[];
  selectedIndex: number;
  startIndex: number; // For offsetting selection when combining staged/unstaged
  sectionTitle: string;
  sectionColor: string;
  maxHeight?: number; // Max visible lines
}

interface TreeNode {
  name: string;
  fullPath: string;
  type: 'file' | 'directory';
  status?: 'M' | 'A' | 'D' | 'R';
  depth: number;
  children?: TreeNode[];
}

/**
 * Build a simple flat list from files
 * Shows full file paths sorted alphabetically
 */
function buildSmartTree(files: GitFile[]): TreeNode[] {
  if (files.length === 0) return [];

  // Sort files alphabetically and return as flat list
  const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

  // Map each file to a tree node
  const nodes = sortedFiles.map(file => ({
    name: file.path,
    fullPath: file.path,
    type: 'file' as const,
    depth: 0,
    status: file.status
  }));

  return nodes;
}

export const FileTree: React.FC<FileTreeProps> = ({
  files,
  selectedIndex,
  startIndex,
  sectionTitle,
  sectionColor,
  maxHeight = 20
}) => {
  // Build smart tree
  const treeNodes = useMemo(() => buildSmartTree(files), [files]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'A': return colors.success;
      case 'M': return colors.warning;
      case 'D': return colors.error;
      case 'R': return colors.info;
      default: return colors.text;
    }
  };

  if (files.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column">
      {/* Section header */}
      <Box>
        <Text bold color={sectionColor}>{sectionTitle}:</Text>
      </Box>

      {/* Render all nodes - parent container handles overflow */}
      {(() => {
        let fileNodeCount = 0;
        return treeNodes.map((node, treeIndex) => {
          // Calculate file index for this node (only count file nodes)
          let fileIndex = -1;
          if (node.type === 'file') {
            fileIndex = fileNodeCount;
            fileNodeCount++;
          }

          const globalFileIndex = node.type === 'file' ? startIndex + fileIndex : -1;
          const isSelected = node.type === 'file' && globalFileIndex === selectedIndex;
          const prefix = isSelected ? '→' : ' ';
          const indent = '  '.repeat(node.depth);

          // All nodes should be files at this point
          if (node.type === 'file' && node.status) {
            const statusColor = getStatusColor(node.status);
            return (
              <Box key={node.fullPath}>
                <Text>
                  {prefix} {statusColor(`[${node.status}]`)} {node.name}
                </Text>
              </Box>
            );
          }

          return null;
        });
      })()}
    </Box>
  );
};
