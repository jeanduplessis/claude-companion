import { simpleGit, SimpleGit, StatusResult } from 'simple-git';

export interface GitFile {
  path: string;
  status: 'M' | 'A' | 'D' | 'R'; // Modified, Added, Deleted, Renamed
  staged: boolean;
  untracked?: boolean; // True if file is not tracked by git
}

export class GitClient {
  private git: SimpleGit;
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = cwd;
    this.git = simpleGit(cwd);
  }

  /**
   * Check if the directory is a git repository
   */
  async isRepo(): Promise<boolean> {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the current branch name
   */
  async getBranch(): Promise<string | null> {
    try {
      const status = await this.git.status();
      return status.current || null;
    } catch (error) {
      console.error('Failed to get branch:', error);
      return null;
    }
  }

  /**
   * Get git status with staged, unstaged, and untracked files
   */
  async getStatus(): Promise<{ staged: GitFile[]; unstaged: GitFile[]; untracked: GitFile[] }> {
    try {
      const status: StatusResult = await this.git.status();

      const staged: GitFile[] = [];
      const unstaged: GitFile[] = [];
      const untracked: GitFile[] = [];

      // Use the files array which has working_dir and index status codes
      status.files.forEach(file => {
        const { path: filePath, index: indexStatus, working_dir: workingStatus } = file;

        // Check if file is untracked first
        if (indexStatus === '?' && workingStatus === '?') {
          untracked.push({
            path: filePath,
            status: 'A',
            staged: false,
            untracked: true
          });
          return; // Don't process further
        }

        // Check if file is staged (index has changes)
        if (indexStatus !== ' ' && indexStatus !== '?' && indexStatus !== '.') {
          const statusChar = this.mapStatusCode(indexStatus);
          staged.push({
            path: filePath,
            status: statusChar,
            staged: true
          });
        }

        // Check if file has unstaged changes (working_dir has changes)
        if (workingStatus !== ' ' && workingStatus !== '?' && workingStatus !== '.') {
          const statusChar = this.mapStatusCode(workingStatus);
          unstaged.push({
            path: filePath,
            status: statusChar,
            staged: false
          });
        }
      });

      return { staged, unstaged, untracked };
    } catch (error) {
      console.error('Failed to get git status:', error);
      return { staged: [], unstaged: [], untracked: [] };
    }
  }

  /**
   * Map git status codes to our status enum
   */
  private mapStatusCode(code: string): 'M' | 'A' | 'D' | 'R' {
    switch (code) {
      case 'M': return 'M'; // Modified
      case 'A': return 'A'; // Added
      case 'D': return 'D'; // Deleted
      case 'R': return 'R'; // Renamed
      default: return 'M';  // Default to modified
    }
  }

  /**
   * Get the diff for a specific file
   */
  async getDiff(file: GitFile): Promise<string | null> {
    try {
      // Extract actual file path (handle renamed files)
      let filePath = file.path;
      if (file.status === 'R') {
        // For renamed files, extract the "to" path
        const match = file.path.match(/→\s+(.+)$/);
        if (match) {
          filePath = match[1];
        }
      }

      if (file.status === 'D') {
        // For deleted files, show deletion message
        return `File deleted: ${filePath}`;
      }

      // Check if file is untracked (not in git index at all)
      if (file.untracked) {
        // For untracked files, show a simple message
        return `Untracked file: ${filePath}\n\nThis file is not yet tracked by git.\nUse 'git add' to start tracking this file.`;
      }

      // Get diff based on staging status
      let diff: string;
      if (file.staged) {
        // Staged changes: compare index with HEAD
        diff = await this.git.diff(['--cached', '--', filePath]);
      } else {
        // Unstaged changes: compare working tree with index
        diff = await this.git.diff(['--', filePath]);
      }

      if (!diff || diff.trim() === '') {
        // Check if it's a new file
        if (file.status === 'A') {
          // For new files, show the entire file as additions
          diff = await this.git.show([`:${filePath}`]).catch(() => {
            return `New file: ${filePath}`;
          });
        } else {
          return 'No changes to display';
        }
      }

      return diff;
    } catch (error) {
      console.error('Failed to get diff:', error);
      return `Error getting diff: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Stage a file (add to git index)
   */
  async stageFile(filePath: string): Promise<void> {
    try {
      await this.git.add(filePath);
    } catch (error) {
      console.error('Failed to stage file:', error);
      throw error;
    }
  }

  /**
   * Unstage a file (remove from git index, keep changes in working tree)
   */
  async unstageFile(filePath: string): Promise<void> {
    try {
      await this.git.reset(['HEAD', '--', filePath]);
    } catch (error) {
      console.error('Failed to unstage file:', error);
      throw error;
    }
  }

  /**
   * Helper to determine file status
   */
  private getFileStatus(status: StatusResult, file: string, isStaged: boolean): 'M' | 'A' | 'D' | 'R' {
    if (status.created.includes(file)) return 'A';
    if (status.deleted.includes(file)) return 'D';
    if (status.renamed.find(r => r.from === file || r.to === file)) return 'R';
    return 'M';
  }

  /**
   * Commit staged changes with a message
   */
  async commit(message: string): Promise<void> {
    try {
      await this.git.commit(message);
    } catch (error) {
      console.error('Failed to commit:', error);
      throw error;
    }
  }
}
