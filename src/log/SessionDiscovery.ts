import fs from 'fs';
import path from 'path';
import { Session } from '../types/events.js';
import { LogManager } from './LogManager.js';

export class SessionDiscovery {
  private logManager: LogManager;
  private watcher: fs.FSWatcher | null = null;

  constructor(logManager: LogManager) {
    this.logManager = logManager;
  }

  /**
   * Discover all active Claude Code sessions
   */
  discoverSessions(): Session[] {
    const logDir = this.logManager.getLogDir();

    // Create directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      return [];
    }

    const files = fs.readdirSync(logDir);
    const logFiles = files.filter(f => f.endsWith('.jsonl'));

    const sessions: Session[] = [];

    for (const file of logFiles) {
      const sessionId = file.replace('.jsonl', '');
      const logPath = path.join(logDir, file);

      // Check if log file is active
      if (!this.logManager.isLogActive(logPath)) {
        continue;
      }

      // Read metadata if available
      const metadata = this.logManager.readMetadata(sessionId);

      // If metadata exists, verify the process is still running
      let isActive = true;
      if (metadata) {
        isActive = this.logManager.isProcessAlive(metadata.pid);
      }

      if (isActive) {
        sessions.push({
          sessionId,
          logPath: logPath,
          metadata: metadata || undefined,
          isActive
        });
      }
    }

    return sessions;
  }

  /**
   * Watch for new sessions
   */
  watchForSessions(callback: (session: Session) => void): void {
    const logDir = this.logManager.getLogDir();

    // Ensure directory exists
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    this.watcher = fs.watch(logDir, (eventType, filename) => {
      if (!filename || !filename.endsWith('.jsonl')) {
        return;
      }

      if (eventType === 'rename') {
        // New log file created
        const sessionId = filename.replace('.jsonl', '');
        const logPath = path.join(logDir, filename);

        if (this.logManager.isLogActive(logPath)) {
          const metadata = this.logManager.readMetadata(sessionId);
          callback({
            sessionId,
            logPath: logPath,
            metadata: metadata || undefined,
            isActive: true
          });
        }
      }
    });
  }

  /**
   * Stop watching for sessions
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Get the most recent session
   */
  getLatestSession(): Session | null {
    const sessions = this.discoverSessions();

    if (sessions.length === 0) {
      return null;
    }

    // Sort by start time (most recent first)
    sessions.sort((a, b) => {
      const aTime = a.metadata?.startTime || 0;
      const bTime = b.metadata?.startTime || 0;
      return bTime - aTime;
    });

    return sessions[0];
  }
}
