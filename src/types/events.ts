export type HookEventType =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'Notification'
  | 'PreCompact'
  | 'SessionStart'
  | 'SessionEnd';

export interface BaseHookEvent {
  id: string;
  eventType: HookEventType;
  timestamp: number;
  sessionId: string;
  transcriptPath?: string;
  cwd?: string;
  permissionMode?: string;
}

export interface PreToolUseEvent extends BaseHookEvent {
  eventType: 'PreToolUse';
  toolName: string;
  toolInput: Record<string, unknown>;
  hookCommand?: string;
  hookOutput?: string;
  hookExitCode?: number;
}

export interface PostToolUseEvent extends BaseHookEvent {
  eventType: 'PostToolUse';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: unknown;
  duration?: number;
  hookCommand?: string;
  hookOutput?: string;
  hookExitCode?: number;
}

export interface UserPromptSubmitEvent extends BaseHookEvent {
  eventType: 'UserPromptSubmit';
  prompt: string;
}

export interface StopEvent extends BaseHookEvent {
  eventType: 'Stop' | 'SubagentStop';
  reason?: string;
}

export interface NotificationEvent extends BaseHookEvent {
  eventType: 'Notification';
  notificationType: string;
  message: string;
}

export interface SessionStartEvent extends BaseHookEvent {
  eventType: 'SessionStart';
}

export interface SessionEndEvent extends BaseHookEvent {
  eventType: 'SessionEnd';
}

export type HookEvent =
  | PreToolUseEvent
  | PostToolUseEvent
  | UserPromptSubmitEvent
  | StopEvent
  | NotificationEvent
  | SessionStartEvent
  | SessionEndEvent;

export interface SessionMetadata {
  sessionId: string;
  pid: number;
  startTime: number;
  cwd: string;
  user: string;
}

export interface Session {
  sessionId: string;
  logPath: string;
  metadata?: SessionMetadata;
  isActive: boolean;
}

export interface FilterState {
  eventTypes: Set<HookEventType>;
  toolNames: Set<string>;
  searchText?: string;
}
