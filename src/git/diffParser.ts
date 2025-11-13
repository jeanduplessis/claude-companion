export interface DiffLine {
  type: 'add' | 'delete' | 'context' | 'header' | 'hunk';
  oldLineNum: number | null;
  newLineNum: number | null;
  content: string;
}

/**
 * Parse unified diff format into structured lines with line numbers
 *
 * Unified diff format:
 * diff --git a/file.txt b/file.txt
 * --- a/file.txt
 * +++ b/file.txt
 * @@ -10,5 +10,6 @@ context
 *  context line
 * -deleted line
 * +added line
 *  context line
 */
export function parseDiff(diffText: string): DiffLine[] {
  if (!diffText || diffText.trim() === '') {
    return [];
  }

  const lines = diffText.split('\n');
  const result: DiffLine[] = [];

  let oldLineNum = 0;
  let newLineNum = 0;
  let inHunk = false;

  for (const line of lines) {
    // Hunk header: @@ -10,5 +10,6 @@ (handles @@ -0,0 +1,5 @@ for new files)
    if (line.startsWith('@@')) {
      const match = line.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) {
        oldLineNum = parseInt(match[1], 10);
        newLineNum = parseInt(match[2], 10);
        inHunk = true;

        result.push({
          type: 'hunk',
          oldLineNum: null,
          newLineNum: null,
          content: line
        });
        continue;
      }
    }

    // File headers
    if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++') || line.startsWith('index ')) {
      result.push({
        type: 'header',
        oldLineNum: null,
        newLineNum: null,
        content: line
      });
      continue;
    }

    // Only process diff content if we're in a hunk
    if (inHunk) {
      if (line.startsWith('+')) {
        // Added line
        result.push({
          type: 'add',
          oldLineNum: null,
          newLineNum: newLineNum,
          content: line.substring(1) // Remove the + prefix
        });
        newLineNum++;
      } else if (line.startsWith('-')) {
        // Deleted line
        result.push({
          type: 'delete',
          oldLineNum: oldLineNum,
          newLineNum: null,
          content: line.substring(1) // Remove the - prefix
        });
        oldLineNum++;
      } else if (line.startsWith(' ')) {
        // Context line
        result.push({
          type: 'context',
          oldLineNum: oldLineNum,
          newLineNum: newLineNum,
          content: line.substring(1) // Remove the space prefix
        });
        oldLineNum++;
        newLineNum++;
      } else if (line.startsWith('\\')) {
        // No newline at end of file marker
        result.push({
          type: 'context',
          oldLineNum: null,
          newLineNum: null,
          content: line
        });
      }
    }
  }

  return result;
}

/**
 * Format line numbers for display
 */
export function formatLineNumbers(line: DiffLine): string {
  const oldNum = line.oldLineNum !== null ? line.oldLineNum.toString().padStart(4, ' ') : '    ';
  const newNum = line.newLineNum !== null ? line.newLineNum.toString().padStart(4, ' ') : '    ';
  return `${oldNum} | ${newNum}`;
}
