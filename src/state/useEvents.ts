import { useState, useEffect, useCallback } from 'react';
import { HookEvent } from '../types/events.js';
import { LogReader } from '../log/LogReader.js';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UseEventsResult {
  events: HookEvent[];
  connectionStatus: ConnectionStatus;
  error: Error | null;
  clearEvents: () => void;
}

export function useEvents(logPath: string | null): UseEventsResult {
  const [events, setEvents] = useState<HookEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<Error | null>(null);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  useEffect(() => {
    if (!logPath) {
      setConnectionStatus('disconnected');
      return;
    }

    const reader = new LogReader();

    setConnectionStatus('connecting');

    // Handle events
    reader.on('event', (event: HookEvent) => {
      setEvents((prev) => [...prev, event]);
    });

    // Handle connection open
    reader.on('open', () => {
      setConnectionStatus('connected');
      setError(null);
    });

    // Handle connection close
    reader.on('close', () => {
      setConnectionStatus('disconnected');
    });

    // Handle errors
    reader.on('error', (err: Error) => {
      setConnectionStatus('error');
      setError(err);
    });

    // Handle parse errors
    reader.on('parse-error', ({ line, error: parseError }: { line: string; error: Error }) => {
      console.error('Failed to parse event:', line, parseError);
    });

    // Open the log
    try {
      reader.openLog(logPath);
    } catch (err) {
      setConnectionStatus('error');
      setError(err as Error);
    }

    // Cleanup on unmount
    return () => {
      reader.removeAllListeners();
      reader.close();
    };
  }, [logPath]);

  return {
    events,
    connectionStatus,
    error,
    clearEvents
  };
}
