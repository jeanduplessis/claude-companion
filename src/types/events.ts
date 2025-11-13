export type HookEventType =
  | 'ToolUse'
  | 'UserPromptSubmit'
  | 'Stop'
  | 'SubagentStop'
  | 'Notification'
  | 'PreCompact'
  | 'SessionStart'
  | 'SessionEnd'
  | 'OTelAPIRequest'
  | 'OTelAPIError'
  | 'OTelToolResult'
  | 'OTelMetricUpdate'
  | 'OTelUserPrompt'
  | 'OTelToolDecision';

// Common hook response fields (returned by all hook types)
export interface CommonHookResponse {
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  systemMessage?: string;
}

// ToolUse-specific hook response (combines Pre/Post ToolUse)
export interface ToolUseHookResponse extends CommonHookResponse {
  permissionDecision?: 'allow' | 'deny' | 'ask';
  permissionDecisionReason?: string;
  updatedInput?: Record<string, unknown>;
  additionalContext?: string;
  // Deprecated fields (still supported)
  decision?: 'approve' | 'block';
  reason?: string;
}

// UserPromptSubmit-specific hook response
export interface UserPromptSubmitHookResponse extends CommonHookResponse {
  decision?: 'block';
  reason?: string;
  additionalContext?: string;
}

// Stop/SubagentStop-specific hook response
export interface StopHookResponse extends CommonHookResponse {
  decision?: 'block';
  reason?: string;
}

// SessionStart-specific hook response
export interface SessionStartHookResponse extends CommonHookResponse {
  additionalContext?: string;
}

export interface BaseHookEvent {
  id: string;
  eventType: HookEventType;
  timestamp: number;
  sessionId: string;
  transcriptPath?: string;
  cwd?: string;
  permissionMode?: string;
  // Raw hook execution data
  hookCommand?: string;
  hookOutput?: string;
  hookExitCode?: number;
  // Parsed hook response (if hook returned JSON)
  hookResponse?: ToolUseHookResponse | UserPromptSubmitHookResponse | StopHookResponse | SessionStartHookResponse;
}

export interface ToolUseEvent extends BaseHookEvent {
  eventType: 'ToolUse';
  toolName: string;
  toolInput: Record<string, unknown>;
  toolResult?: unknown;
  duration?: number;
  hookResponse?: ToolUseHookResponse;
}

export interface UserPromptSubmitEvent extends BaseHookEvent {
  eventType: 'UserPromptSubmit';
  prompt: string;
  hookResponse?: UserPromptSubmitHookResponse;
}

export interface StopEvent extends BaseHookEvent {
  eventType: 'Stop' | 'SubagentStop';
  reason?: string;
  stopHookActive?: boolean;
  hookResponse?: StopHookResponse;
}

export interface NotificationEvent extends BaseHookEvent {
  eventType: 'Notification';
  notificationType: string;
  message: string;
}

export interface PreCompactEvent extends BaseHookEvent {
  eventType: 'PreCompact';
  trigger: 'manual' | 'auto';
  customInstructions?: string;
}

export interface SessionStartEvent extends BaseHookEvent {
  eventType: 'SessionStart';
  source: 'startup' | 'resume' | 'clear' | 'compact';
  hookResponse?: SessionStartHookResponse;
}

export interface SessionEndEvent extends BaseHookEvent {
  eventType: 'SessionEnd';
  reason: 'clear' | 'logout' | 'prompt_input_exit' | 'other';
}

// OpenTelemetry Event Types

export interface OTelAPIRequestEvent extends BaseHookEvent {
  eventType: 'OTelAPIRequest';
  model: string;
  cost: number;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
}

export interface OTelAPIErrorEvent extends BaseHookEvent {
  eventType: 'OTelAPIError';
  model?: string;
  errorMessage: string;
  statusCode?: number;
  durationMs?: number;
  attempt?: number;
}

export interface OTelToolResultEvent extends BaseHookEvent {
  eventType: 'OTelToolResult';
  toolName: string;
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  decision?: 'accept' | 'reject';
  source?: 'config' | 'user_permanent' | 'user_temporary' | 'user_abort' | 'user_reject';
  toolParameters?: Record<string, unknown>;
}

export interface OTelMetricUpdateEvent extends BaseHookEvent {
  eventType: 'OTelMetricUpdate';
  metricName: string;
  value: number;
  unit?: string;
  attributes: Record<string, string | number | boolean>;
}

export interface OTelUserPromptEvent extends BaseHookEvent {
  eventType: 'OTelUserPrompt';
  promptLength: number;
  promptContent?: string;
}

export interface OTelToolDecisionEvent extends BaseHookEvent {
  eventType: 'OTelToolDecision';
  toolName: string;
  decision: 'accept' | 'reject';
  source: 'config' | 'user_permanent' | 'user_temporary' | 'user_abort' | 'user_reject';
}

export type HookEvent =
  | ToolUseEvent
  | UserPromptSubmitEvent
  | StopEvent
  | NotificationEvent
  | PreCompactEvent
  | SessionStartEvent
  | SessionEndEvent
  | OTelAPIRequestEvent
  | OTelAPIErrorEvent
  | OTelToolResultEvent
  | OTelMetricUpdateEvent
  | OTelUserPromptEvent
  | OTelToolDecisionEvent;

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
