import fs from 'fs';
import { EventEmitter } from 'events';
import { parseOTLPLogLine, ParsedOTelLog } from './OtlpParser.js';
import {
  HookEvent,
  OTelAPIRequestEvent,
  OTelAPIErrorEvent,
  OTelToolResultEvent,
  OTelUserPromptEvent,
  OTelToolDecisionEvent,
} from '../types/events.js';
import { nanoid } from 'nanoid';

/**
 * Reads and parses OpenTelemetry log files (OTLP JSON format)
 * Emits events compatible with existing HookEvent structure
 */
export class OTelLogReader extends EventEmitter {
  private logPath: string | null = null;
  private isOpen: boolean = false;
  private fileWatcher: fs.FSWatcher | null = null;
  private fileSize: number = 0;
  private sessionId: string;

  constructor(sessionId: string) {
    super();
    this.sessionId = sessionId;
  }

  /**
   * Open the OTel log file and start reading events (tail -f style)
   */
  openLog(logPath: string): void {
    if (this.isOpen) {
      throw new Error('File is already open');
    }

    this.logPath = logPath;
    this.isOpen = true;

    try {
      // Read existing content first
      if (fs.existsSync(logPath)) {
        const stat = fs.statSync(logPath);
        this.fileSize = stat.size;

        // Read existing lines
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(line => line.trim());
        for (const line of lines) {
          this.handleLine(line);
        }
      }

      // Watch for file changes (tail -f behavior)
      this.fileWatcher = fs.watch(logPath, (eventType) => {
        if (eventType === 'change') {
          this.readNewContent();
        }
      });

      this.emit('open');
    } catch (error) {
      this.isOpen = false;
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Read new content that was appended to the file
   */
  private readNewContent(): void {
    if (!this.logPath || !fs.existsSync(this.logPath)) {
      return;
    }

    try {
      const stat = fs.statSync(this.logPath);
      const newSize = stat.size;

      if (newSize > this.fileSize) {
        // Read only the new content
        const fd = fs.openSync(this.logPath, 'r');
        const buffer = Buffer.alloc(newSize - this.fileSize);
        fs.readSync(fd, buffer, 0, buffer.length, this.fileSize);
        fs.closeSync(fd);

        const newContent = buffer.toString('utf8');
        const lines = newContent.split('\n').filter(line => line.trim());

        for (const line of lines) {
          this.handleLine(line);
        }

        this.fileSize = newSize;
      }
    } catch (error) {
      // Ignore errors (file might be being written to)
    }
  }

  /**
   * Handle a line from the log file (OTLP JSON format)
   */
  private handleLine(line: string): void {
    if (!line.trim()) {
      return;
    }

    try {
      const parsedLogs = parseOTLPLogLine(line);

      for (const log of parsedLogs) {
        const event = this.transformToHookEvent(log);
        if (event) {
          this.emit('event', event);
        }
      }
    } catch (error) {
      this.emit('parse-error', { line, error });
    }
  }

  /**
   * Transform parsed OTLP log to HookEvent format
   */
  private transformToHookEvent(log: ParsedOTelLog): HookEvent | null {
    const baseEvent = {
      id: nanoid(),
      timestamp: log.timestamp.getTime(),
      sessionId: log.sessionId || this.sessionId,
      cwd: log.resourceAttributes.cwd as string | undefined,
      permissionMode: log.resourceAttributes.permission_mode as string | undefined,
    };

    // Map event.name to appropriate event type
    switch (log.eventName) {
      case 'claude_code.api_request':
        return {
          ...baseEvent,
          eventType: 'OTelAPIRequest',
          model: log.logAttributes.model as string,
          cost: log.logAttributes.cost_usd as number,
          durationMs: log.logAttributes.duration_ms as number,
          inputTokens: log.logAttributes.input_tokens as number,
          outputTokens: log.logAttributes.output_tokens as number,
          cacheReadTokens: log.logAttributes.cache_read_tokens as number,
          cacheCreationTokens: log.logAttributes.cache_creation_tokens as number,
        } as OTelAPIRequestEvent;

      case 'claude_code.api_error':
        return {
          ...baseEvent,
          eventType: 'OTelAPIError',
          model: log.logAttributes.model as string | undefined,
          errorMessage: log.logAttributes.error as string,
          statusCode: log.logAttributes.status_code as number | undefined,
          durationMs: log.logAttributes.duration_ms as number | undefined,
          attempt: log.logAttributes.attempt as number | undefined,
        } as OTelAPIErrorEvent;

      case 'claude_code.tool_result':
        return {
          ...baseEvent,
          eventType: 'OTelToolResult',
          toolName: log.logAttributes.tool_name as string,
          success: log.logAttributes.success === 'true',
          durationMs: log.logAttributes.duration_ms as number,
          errorMessage: log.logAttributes.error as string | undefined,
          decision: log.logAttributes.decision as 'accept' | 'reject' | undefined,
          source: log.logAttributes.source as
            | 'config'
            | 'user_permanent'
            | 'user_temporary'
            | 'user_abort'
            | 'user_reject'
            | undefined,
          toolParameters: log.logAttributes.tool_parameters
            ? JSON.parse(log.logAttributes.tool_parameters as string)
            : undefined,
        } as OTelToolResultEvent;

      case 'claude_code.user_prompt':
        return {
          ...baseEvent,
          eventType: 'OTelUserPrompt',
          promptLength: log.logAttributes.prompt_length as number,
          promptContent: log.logAttributes.prompt as string | undefined,
        } as OTelUserPromptEvent;

      case 'claude_code.tool_decision':
        return {
          ...baseEvent,
          eventType: 'OTelToolDecision',
          toolName: log.logAttributes.tool_name as string,
          decision: log.logAttributes.decision as 'accept' | 'reject',
          source: log.logAttributes.source as 'config' | 'user_permanent' | 'user_temporary' | 'user_abort' | 'user_reject',
        } as OTelToolDecisionEvent;

      default:
        // Unknown event type, skip
        return null;
    }
  }

  /**
   * Close the log file and stop watching
   */
  close(): void {
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }

    this.isOpen = false;
    this.logPath = null;
    this.fileSize = 0;
  }

  /**
   * Check if the log reader is open
   */
  isReaderOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get the current log path
   */
  getCurrentLogPath(): string | null {
    return this.logPath;
  }
}
