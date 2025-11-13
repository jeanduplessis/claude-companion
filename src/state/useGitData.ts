import { useState, useEffect, useCallback, useRef } from 'react';
import fs from 'fs';
import path from 'path';
import { GitClient, GitFile } from '../git/GitClient.js';

export interface GitData {
  branch: string | null;
  stagedFiles: GitFile[];
  unstagedFiles: GitFile[];
  untrackedFiles: GitFile[];
  loading: boolean;
  error: string | null;
  isRepo: boolean;
}

export interface UseGitDataResult {
  data: GitData;
  refresh: () => Promise<void>;
  getDiff: (file: GitFile) => Promise<string | null>;
  stageFile: (filePath: string) => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  stageAllFiles: (filePaths: string[]) => Promise<void>;
  commit: (message: string) => Promise<void>;
}

/**
 * Custom hook for managing git repository state
 * Fetches git status and provides diff retrieval functionality
 * Watches file system for automatic updates
 */
export function useGitData(cwd: string | null): UseGitDataResult {
  const [data, setData] = useState<GitData>({
    branch: null,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    loading: false,
    error: null,
    isRepo: false
  });

  const [gitClient, setGitClient] = useState<GitClient | null>(null);
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize git client when cwd changes
  useEffect(() => {
    if (!cwd) {
      setGitClient(null);
      setData({
        branch: null,
        stagedFiles: [],
        unstagedFiles: [],
        untrackedFiles: [],
        loading: false,
        error: 'No working directory available',
        isRepo: false
      });
      return;
    }

    const client = new GitClient(cwd);
    setGitClient(client);
  }, [cwd]);

  // Fetch git status
  const refresh = useCallback(async () => {
    if (!gitClient) {
      return;
    }

    setData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Check if it's a git repository
      const isRepo = await gitClient.isRepo();

      if (!isRepo) {
        setData({
          branch: null,
          stagedFiles: [],
          unstagedFiles: [],
          untrackedFiles: [],
          loading: false,
          error: 'Not a git repository',
          isRepo: false
        });
        return;
      }

      // Fetch branch and status
      const [branch, status] = await Promise.all([
        gitClient.getBranch(),
        gitClient.getStatus()
      ]);

      setData({
        branch,
        stagedFiles: status.staged,
        unstagedFiles: status.unstaged,
        untrackedFiles: status.untracked,
        loading: false,
        error: null,
        isRepo: true
      });
    } catch (error) {
      console.error('Error fetching git data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  }, [gitClient]);

  // Fetch diff for a specific file
  const getDiff = useCallback(async (file: GitFile): Promise<string | null> => {
    if (!gitClient) {
      return null;
    }

    try {
      return await gitClient.getDiff(file);
    } catch (error) {
      console.error('Error fetching diff:', error);
      return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }, [gitClient]);

  // Initial load when git client is ready
  useEffect(() => {
    if (gitClient) {
      refresh();
    }
  }, [gitClient, refresh]);

  // Watch file system for changes (Phase 3)
  useEffect(() => {
    if (!cwd || !gitClient) {
      return;
    }

    const gitIndexPath = path.join(cwd, '.git', 'index');
    let watcher: fs.FSWatcher | null = null;
    let dirWatcher: fs.FSWatcher | null = null;

    // Debounced refresh function that uses the latest refresh callback
    const debouncedRefresh = () => {
      // Clear any pending timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Set new timeout (500ms debounce)
      refreshTimeoutRef.current = setTimeout(() => {
        // Call refresh directly, not from the closure
        gitClient.getStatus().then((status) => {
          setData(prev => ({
            ...prev,
            stagedFiles: status.staged,
            unstagedFiles: status.unstaged,
            untrackedFiles: status.untracked,
            loading: false,
            error: null
          }));
        }).catch((error) => {
          console.error('Error refreshing git data:', error);
        });
      }, 500);
    };

    // List of directories to ignore
    const shouldIgnore = (filename: string | null): boolean => {
      if (!filename) return false;
      const ignorePaths = ['.git', 'node_modules', 'dist', 'build', '.next', '.cache', 'coverage'];
      return ignorePaths.some(ignore => filename.startsWith(ignore));
    };

    try {
      // Watch .git/index file for changes (staged/unstaged modifications)
      if (fs.existsSync(gitIndexPath)) {
        watcher = fs.watch(gitIndexPath, (eventType) => {
          if (eventType === 'change') {
            debouncedRefresh();
          }
        });
      }

      // Also watch the working directory for new/deleted files (non-recursive for performance)
      dirWatcher = fs.watch(cwd, (eventType, filename) => {
        // Ignore common build/dependency directories
        if (!shouldIgnore(filename)) {
          debouncedRefresh();
        }
      });

      // Cleanup
      return () => {
        if (watcher) {
          watcher.close();
        }
        if (dirWatcher) {
          dirWatcher.close();
        }
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    } catch (error) {
      console.error('Error setting up file watcher:', error);
      // Continue without file watching
      return () => {};
    }
  }, [cwd, gitClient]); // Removed 'refresh' from dependencies to prevent unnecessary watcher resets

  // Stage a file
  const stageFile = useCallback(async (filePath: string) => {
    if (!gitClient) {
      throw new Error('Git client not initialized');
    }

    try {
      await gitClient.stageFile(filePath);
      // Refresh git status after staging
      await refresh();
    } catch (error) {
      console.error('Error staging file:', error);
      throw error;
    }
  }, [gitClient, refresh]);

  // Unstage a file
  const unstageFile = useCallback(async (filePath: string) => {
    if (!gitClient) {
      throw new Error('Git client not initialized');
    }

    try {
      await gitClient.unstageFile(filePath);
      // Refresh git status after unstaging
      await refresh();
    } catch (error) {
      console.error('Error unstaging file:', error);
      throw error;
    }
  }, [gitClient, refresh]);

  // Stage multiple files at once (to avoid multiple refreshes)
  const stageAllFiles = useCallback(async (filePaths: string[]) => {
    if (!gitClient) {
      throw new Error('Git client not initialized');
    }

    try {
      // Stage all files without refreshing
      for (const filePath of filePaths) {
        await gitClient.stageFile(filePath);
      }
      // Refresh once after all files are staged
      await refresh();
    } catch (error) {
      console.error('Error staging files:', error);
      throw error;
    }
  }, [gitClient, refresh]);

  // Commit staged changes
  const commit = useCallback(async (message: string) => {
    if (!gitClient) {
      throw new Error('Git client not initialized');
    }

    try {
      await gitClient.commit(message);
      // Refresh git status after commit
      await refresh();
    } catch (error) {
      console.error('Error committing:', error);
      throw error;
    }
  }, [gitClient, refresh]);

  return {
    data,
    refresh,
    getDiff,
    stageFile,
    unstageFile,
    stageAllFiles,
    commit
  };
}
