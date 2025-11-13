import fs from 'fs';
import { EventEmitter } from 'events';
import { parseOTLPMetricLine, ParsedOTelMetric } from './OtlpParser.js';
import { OTelMetricUpdateEvent } from '../types/events.js';
import { nanoid } from 'nanoid';

/**
 * Reads and parses OpenTelemetry metrics files (OTLP JSON format)
 * Emits metric update events compatible with existing HookEvent structure
 */
export class OTelMetricsReader extends EventEmitter {
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
   * Open the OTel metrics file and start reading (tail -f style)
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
   * Handle a line from the metrics file (OTLP JSON format)
   */
  private handleLine(line: string): void {
    if (!line.trim()) {
      return;
    }

    try {
      const parsedMetrics = parseOTLPMetricLine(line);

      for (const metric of parsedMetrics) {
        const event = this.transformToHookEvent(metric);
        if (event) {
          this.emit('metric', event);
        }
      }
    } catch (error) {
      this.emit('parse-error', { line, error });
    }
  }

  /**
   * Transform parsed OTLP metric to HookEvent format
   */
  private transformToHookEvent(metric: ParsedOTelMetric): OTelMetricUpdateEvent {
    return {
      id: nanoid(),
      eventType: 'OTelMetricUpdate',
      timestamp: metric.timestamp ? metric.timestamp.getTime() : Date.now(),
      sessionId: metric.sessionId || this.sessionId,
      cwd: metric.resourceAttributes.cwd as string | undefined,
      permissionMode: metric.resourceAttributes.permission_mode as string | undefined,
      metricName: metric.metricName,
      value: metric.value,
      unit: metric.unit,
      attributes: metric.metricAttributes,
    };
  }

  /**
   * Close the metrics file and stop watching
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
   * Check if the metrics reader is open
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
