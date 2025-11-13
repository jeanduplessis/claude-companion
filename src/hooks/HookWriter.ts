/**
 * Hook Writer for Claude Code
 *
 * This utility writes hook events to a log file (JSONL format) that can be
 * read by the claude-companion TUI monitor.
 *
 * Usage:
 *   1. Copy this file to your Claude Code hooks directory
 *   2. Import and use in your hooks configuration
 *   3. Run claude-companion to monitor events
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import crypto from 'crypto';

const LOG_DIR = path.join(os.homedir(), '.claude-code', 'hooks');

export class HookWriter {
  private sessionId: string;
  private logPath: string;
  private metadataPath: string;
  private logStream: fs.WriteStream | null = null;

  constructor(sessionId?: string) {
    // Use provided session ID or generate one
    this.sessionId = sessionId || process.env.CLAUDE_SESSION_ID || this.generateSessionId();
    this.logPath = path.join(LOG_DIR, `${this.sessionId}.jsonl`);
    this.metadataPath = path.join(LOG_DIR, `${this.sessionId}.meta`);

    this.initialize();
  }

  private generateSessionId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  private initialize(): void {
    // Ensure directory exists
    fs.mkdirSync(LOG_DIR, { recursive: true });

    // Write metadata
    this.writeMetadata();

    // Open log file for appending
    try {
      this.logStream = fs.createWriteStream(this.logPath, { flags: 'a', encoding: 'utf8' });

      // Handle errors gracefully
      this.logStream.on('error', (err: NodeJS.ErrnoException) => {
        console.error('Failed to write to log:', err);
        this.logStream = null;
      });
    } catch (error) {
      console.error('Failed to create log stream:', error);
      this.logStream = null;
    }
  }

  private writeMetadata(): void {
    const metadata = {
      sessionId: this.sessionId,
      pid: process.pid,
      startTime: Date.now(),
      cwd: process.cwd(),
      user: os.userInfo().username
    };

    fs.writeFileSync(this.metadataPath, JSON.stringify(metadata, null, 2));
  }

  /**
   * Write an event to the log
   */
  writeEvent(event: any): void {
    // Ensure event has required fields
    const fullEvent = {
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || Date.now(),
      sessionId: this.sessionId
    };

    const eventJson = JSON.stringify(fullEvent) + '\n';

    // Try to write to log
    if (this.logStream && !this.logStream.destroyed) {
      try {
        this.logStream.write(eventJson);
      } catch (error) {
        // Write failed, stream might be closed
        this.logStream = null;
      }
    }
  }

  /**
   * Close the log and clean up
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }

    // Clean up log and metadata
    try {
      if (fs.existsSync(this.logPath)) {
        fs.unlinkSync(this.logPath);
      }
      if (fs.existsSync(this.metadataPath)) {
        fs.unlinkSync(this.metadataPath);
      }
    } catch (error) {
      console.error('Failed to cleanup:', error);
    }
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Singleton instance
let writerInstance: HookWriter | null = null;

export function getHookWriter(sessionId?: string): HookWriter {
  if (!writerInstance) {
    writerInstance = new HookWriter(sessionId);

    // Cleanup on process exit
    process.on('exit', () => {
      if (writerInstance) {
        writerInstance.close();
      }
    });

    process.on('SIGINT', () => {
      if (writerInstance) {
        writerInstance.close();
      }
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      if (writerInstance) {
        writerInstance.close();
      }
      process.exit(0);
    });
  }

  return writerInstance;
}
