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
    ToolUse: 'Tool',
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
function formatToolInputCompact(input: Record<string, unknown>, basePath?: string, toolName?: string): string {
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

  // Special handling for common multi-parameter tools
  // Show the most important parameter (usually file path or command)
  const priorityKeys = ['file_path', 'notebook_path', 'command', 'pattern', 'url', 'query', 'path'];

  for (const key of priorityKeys) {
    if (key in processedInput) {
      const value = processedInput[key];
      if (typeof value === 'string') {
        return truncate(value, 80);
      }
    }
  }

  // For multiple parameters without priority key, show key names
  const keys = entries.slice(0, 3).map(([k]) => k).join(', ');
  return entries.length > 3 ? `${keys}, ...` : keys;
}

/**
 * Get a summary line for an event
 */
export function getEventSummary(event: HookEvent, basePath?: string): string {
  switch (event.eventType) {
    case 'ToolUse':
      const toolName = 'toolName' in event ? event.toolName : 'Unknown';
      const input = 'toolInput' in event ? formatToolInputCompact(event.toolInput as Record<string, unknown>, basePath, toolName) : '';
      const duration = 'duration' in event && event.duration ? ` (${event.duration}ms)` : '';

      return input ? `${toolName}${duration} → ${input}` : `${toolName}${duration}`;

    case 'UserPromptSubmit':
      const rawPrompt = 'prompt' in event ? event.prompt : '';

      // For multi-line prompts, show first line with indicator
      const lines = rawPrompt.split('\n').filter(line => line.trim());
      if (lines.length > 1) {
        return truncate(lines[0], 90) + ' [...]';
      }

      return truncate(rawPrompt, 100);

    case 'Notification':
      const notifType = 'notificationType' in event ? event.notificationType : '';
      const message = 'message' in event ? event.message : '';

      // Format notification type in a more readable way
      const formattedType = notifType
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return formattedType ? `${formattedType}: ${truncate(message, 70)}` : truncate(message, 80);

    case 'Stop':
      const stopReason = 'reason' in event && event.reason ? event.reason : 'User stopped';
      const stopHookActive = 'stopHookActive' in event && event.stopHookActive ? ' [hook active]' : '';
      return `${stopReason}${stopHookActive}`;

    case 'SubagentStop':
      const subReason = 'reason' in event && event.reason ? event.reason : 'Subagent stopped';
      const subHookActive = 'stopHookActive' in event && event.stopHookActive ? ' [hook active]' : '';
      return `${subReason}${subHookActive}`;

    case 'PreCompact':
      const trigger = 'trigger' in event ? event.trigger : 'unknown';
      const hasInstructions = 'customInstructions' in event && event.customInstructions ? ' (with instructions)' : '';
      return `${trigger} compact${hasInstructions}`;

    case 'SessionStart':
      const source = 'source' in event ? `[${event.source}]` : '';
      const cwd = event.cwd ? `cwd: ${truncate(makePathRelative(event.cwd, basePath), 60)}` : '';
      return `${source} ${cwd}`.trim();

    case 'SessionEnd':
      const endReason = 'reason' in event && event.reason ? ` (${event.reason})` : '';
      return `Session terminated${endReason}`;

    default:
      return '';
  }
}
