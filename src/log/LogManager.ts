import fs from 'fs';
import path from 'path';
import os from 'os';
import { SessionMetadata } from '../types/events.js';

export class LogManager {
  private readonly logDir: string;

  constructor() {
    this.logDir = path.join(os.homedir(), '.claude-code', 'hooks');
  }

  /**
   * Get the path to a session's log file (jsonl format)
   */
  getLogPath(sessionId: string): string {
    return path.join(this.logDir, `${sessionId}.jsonl`);
  }

  /**
   * Get the path to a session's metadata file
   */
  getMetadataPath(sessionId: string): string {
    return path.join(this.logDir, `${sessionId}.meta`);
  }

  /**
   * Check if a log file exists and is a regular file
   */
  isLogActive(logPath: string): boolean {
    try {
      const stat = fs.statSync(logPath);
      return stat.isFile();
    } catch {
      return false;
    }
  }

  /**
   * Write metadata for a session
   */
  writeMetadata(sessionId: string, metadata: SessionMetadata): void {
    const metaPath = this.getMetadataPath(sessionId);
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Read metadata for a session
   */
  readMetadata(sessionId: string): SessionMetadata | null {
    const metaPath = this.getMetadataPath(sessionId);
    try {
      const content = fs.readFileSync(metaPath, 'utf8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Check if a process is still running
   */
  public isProcessAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up stale log files (where the process is no longer running)
   */
  cleanupStaleLogs(): void {
    if (!fs.existsSync(this.logDir)) {
      return;
    }

    const files = fs.readdirSync(this.logDir);
    const logFiles = files.filter(f => f.endsWith('.jsonl'));

    for (const logFile of logFiles) {
      const sessionId = logFile.replace('.jsonl', '');
      const logPath = this.getLogPath(sessionId);
      const metaPath = this.getMetadataPath(sessionId);

      // Check if metadata exists
      if (fs.existsSync(metaPath)) {
        const metadata = this.readMetadata(sessionId);

        if (metadata && !this.isProcessAlive(metadata.pid)) {
          // Process is dead, clean up
          try {
            fs.unlinkSync(logPath);
            fs.unlinkSync(metaPath);
          } catch (error) {
            console.error(`Failed to cleanup log file for session ${sessionId}:`, error);
          }
        }
      }
    }
  }

  /**
   * Get the log directory
   */
  getLogDir(): string {
    return this.logDir;
  }
}
