import { formatDistanceToNow } from 'date-fns';
import { HookEvent } from '../types/events.js';
import { makePathRelative, makePathsRelativeInObject } from './pathUtils.js';

/**
 * Format a timestamp as relative time
 */
export function formatTimestamp(timestamp: number): string {
  return formatDistanceToNow(timestamp, { addSuffix: true });
}

/**
 * Format a timestamp as absolute time
 */
export function formatAbsoluteTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

/**
 * Get a short label for an event type
 */
export function getEventTypeLabel(eventType: string): string {
  const labels: Record<string, string> = {
    PreToolUse: 'Before',
    PostToolUse: 'After',
    UserPromptSubmit: 'Prompt',
    Stop: 'Stop',
    SubagentStop: 'SubStop',
    Notification: 'Notify',
    PreCompact: 'Compact',
    SessionStart: 'Start',
    SessionEnd: 'End'
  };
  return labels[eventType] || eventType;
}

/**
 * Format tool input for display
 */
export function formatToolInput(input: Record<string, unknown>, basePath?: string): string {
  if (!input || Object.keys(input).length === 0) {
    return '{}';
  }

  // Convert absolute paths to relative ones
  const processedInput = makePathsRelativeInObject(input, basePath) as Record<string, unknown>;

  // Try to create a compact representation
  const entries = Object.entries(processedInput);
  if (entries.length === 1) {
    const [key, value] = entries[0];
    if (typeof value === 'string' && value.length < 50) {
      return `${key}: ${value}`;
    }
  }

  return JSON.stringify(processedInput, null, 2);
}

/**
 * Truncate text to a maximum length
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Format tool input for single-line display
 */
function formatToolInputCompact(input: Record<string, unknown>, basePath?: string): string {
  if (!input || Object.keys(input).length === 0) {
    return '';
  }

  // Convert absolute paths to relative ones
  const processedInput = makePathsRelativeInObject(input, basePath) as Record<string, unknown>;
  const entries = Object.entries(processedInput);

  // For single parameter tools
  if (entries.length === 1) {
    const [key, value] = entries[0];
    if (typeof value === 'string') {
      return truncate(value, 80);
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return `${key}=${value}`;
    }
  }

  // For multiple parameters, show key names
  const keys = entries.slice(0, 3).map(([k]) => k).join(', ');
  return entries.length > 3 ? `${keys}, ...` : keys;
}

/**
 * Get a summary line for an event
 */
export function getEventSummary(event: HookEvent, basePath?: string): string {
  switch (event.eventType) {
    case 'PreToolUse':
      const preToolName = 'toolName' in event ? event.toolName : 'Unknown';
      const preInput = 'toolInput' in event ? formatToolInputCompact(event.toolInput as Record<string, unknown>, basePath) : '';
      return preInput ? `${preToolName} → ${preInput}` : preToolName;

    case 'PostToolUse':
      const postToolName = 'toolName' in event ? event.toolName : 'Unknown';
      const duration = 'duration' in event && event.duration ? ` (${event.duration}ms)` : '';
      const postInput = 'toolInput' in event ? formatToolInputCompact(event.toolInput as Record<string, unknown>, basePath) : '';

      // Show exit code if hook was executed
      const exitCode = 'hookExitCode' in event && event.hookExitCode !== undefined
        ? ` [exit: ${event.hookExitCode}]`
        : '';

      return postInput
        ? `${postToolName}${duration}${exitCode} → ${postInput}`
        : `${postToolName}${duration}${exitCode}`;

    case 'UserPromptSubmit':
      const prompt = 'prompt' in event ? truncate(event.prompt, 100) : '';
      return prompt;

    case 'Notification':
      const notifType = 'notificationType' in event ? `[${event.notificationType}]` : '';
      const message = 'message' in event ? event.message : '';
      return `${notifType} ${truncate(message, 80)}`.trim();

    case 'Stop':
      const stopReason = 'reason' in event && event.reason ? event.reason : 'User stopped';
      return stopReason;

    case 'SubagentStop':
      const subReason = 'reason' in event && event.reason ? event.reason : 'Subagent stopped';
      return subReason;

    case 'SessionStart':
      const cwd = event.cwd ? `cwd: ${truncate(makePathRelative(event.cwd, basePath), 60)}` : '';
      return cwd;

    case 'SessionEnd':
      return 'Session terminated';

    default:
      return '';
  }
}
