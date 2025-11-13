import { useState, useEffect } from 'react';
import { OTelLogReader } from '../otel/OTelLogReader.js';
import { OTelMetricsReader } from '../otel/OTelMetricsReader.js';
import {
  OTelAPIRequestEvent,
  OTelAPIErrorEvent,
  OTelMetricUpdateEvent,
  OTelToolResultEvent,
} from '../types/events.js';

export interface MetricsSummary {
  // Cost and token metrics
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCacheReadTokens: number;
  totalCacheCreationTokens: number;

  // API metrics
  apiRequestCount: number;
  apiErrorCount: number;
  avgApiDuration: number;

  // Tool metrics
  toolExecutions: number;
  toolSuccesses: number;
  toolFailures: number;
  avgToolDuration: number;

  // Code metrics (from OTel metrics)
  linesAdded: number;
  linesRemoved: number;
  commitsCreated: number;
  pullRequestsCreated: number;

  // Session metrics
  activeTimeSeconds: number;

  // Model breakdown
  modelUsage: Record<string, { count: number; cost: number; tokens: number }>;

  // Recent API requests (last 10)
  recentAPIRequests: OTelAPIRequestEvent[];
}

export interface UseOtelMetricsResult {
  metrics: MetricsSummary;
  isConnected: boolean;
}

const initialMetrics: MetricsSummary = {
  totalCost: 0,
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalCacheReadTokens: 0,
  totalCacheCreationTokens: 0,
  apiRequestCount: 0,
  apiErrorCount: 0,
  avgApiDuration: 0,
  toolExecutions: 0,
  toolSuccesses: 0,
  toolFailures: 0,
  avgToolDuration: 0,
  linesAdded: 0,
  linesRemoved: 0,
  commitsCreated: 0,
  pullRequestsCreated: 0,
  activeTimeSeconds: 0,
  modelUsage: {},
  recentAPIRequests: [],
};

export function useOtelMetrics(
  sessionId: string,
  logsPath: string | null,
  metricsPath: string | null
): UseOtelMetricsResult {
  const [metrics, setMetrics] = useState<MetricsSummary>(initialMetrics);
  const [isConnected, setIsConnected] = useState(false);

  // Track running totals for averages
  const [apiDurations, setApiDurations] = useState<number[]>([]);
  const [toolDurations, setToolDurations] = useState<number[]>([]);

  useEffect(() => {
    if (!logsPath && !metricsPath) {
      setIsConnected(false);
      return;
    }

    const logReader = logsPath ? new OTelLogReader(sessionId) : null;
    const metricsReader = metricsPath ? new OTelMetricsReader(sessionId) : null;

    // Handle log events (API requests, tool results, etc.)
    if (logReader && logsPath) {
      logReader.on('event', (event) => {
        if (event.eventType === 'OTelAPIRequest') {
          const apiEvent = event as OTelAPIRequestEvent;

          setMetrics((prev) => {
            const updatedModelUsage = { ...prev.modelUsage };
            if (!updatedModelUsage[apiEvent.model]) {
              updatedModelUsage[apiEvent.model] = { count: 0, cost: 0, tokens: 0 };
            }
            updatedModelUsage[apiEvent.model].count++;
            updatedModelUsage[apiEvent.model].cost += apiEvent.cost;
            updatedModelUsage[apiEvent.model].tokens += apiEvent.inputTokens + apiEvent.outputTokens;

            const recentRequests = [apiEvent, ...prev.recentAPIRequests].slice(0, 10);

            return {
              ...prev,
              totalCost: prev.totalCost + apiEvent.cost,
              totalInputTokens: prev.totalInputTokens + apiEvent.inputTokens,
              totalOutputTokens: prev.totalOutputTokens + apiEvent.outputTokens,
              totalCacheReadTokens: prev.totalCacheReadTokens + apiEvent.cacheReadTokens,
              totalCacheCreationTokens: prev.totalCacheCreationTokens + apiEvent.cacheCreationTokens,
              apiRequestCount: prev.apiRequestCount + 1,
              modelUsage: updatedModelUsage,
              recentAPIRequests: recentRequests,
            };
          });

          setApiDurations((prev) => [...prev, apiEvent.durationMs]);
        } else if (event.eventType === 'OTelAPIError') {
          setMetrics((prev) => ({
            ...prev,
            apiErrorCount: prev.apiErrorCount + 1,
          }));
        } else if (event.eventType === 'OTelToolResult') {
          const toolEvent = event as OTelToolResultEvent;

          setMetrics((prev) => ({
            ...prev,
            toolExecutions: prev.toolExecutions + 1,
            toolSuccesses: toolEvent.success ? prev.toolSuccesses + 1 : prev.toolSuccesses,
            toolFailures: !toolEvent.success ? prev.toolFailures + 1 : prev.toolFailures,
          }));

          setToolDurations((prev) => [...prev, toolEvent.durationMs]);
        }
      });

      logReader.on('open', () => {
        setIsConnected(true);
      });

      try {
        logReader.openLog(logsPath);
      } catch (error) {
        console.error('Failed to open OTel logs:', error);
      }
    }

    // Handle metrics (counters for LOC, commits, etc.)
    if (metricsReader && metricsPath) {
      metricsReader.on('metric', (event: OTelMetricUpdateEvent) => {
        setMetrics((prev) => {
          const update = { ...prev };

          switch (event.metricName) {
            case 'claude_code.lines_of_code.count':
              if (event.attributes.type === 'added') {
                update.linesAdded = event.value;
              } else if (event.attributes.type === 'removed') {
                update.linesRemoved = event.value;
              }
              break;

            case 'claude_code.commit.count':
              update.commitsCreated = event.value;
              break;

            case 'claude_code.pull_request.count':
              update.pullRequestsCreated = event.value;
              break;

            case 'claude_code.active_time.total':
              update.activeTimeSeconds = event.value;
              break;

            // Token and cost metrics are already tracked via API request events
            // but we could use these as authoritative sources if preferred
          }

          return update;
        });
      });

      metricsReader.on('open', () => {
        setIsConnected(true);
      });

      try {
        metricsReader.openLog(metricsPath);
      } catch (error) {
        console.error('Failed to open OTel metrics:', error);
      }
    }

    // Cleanup
    return () => {
      if (logReader) {
        logReader.close();
      }
      if (metricsReader) {
        metricsReader.close();
      }
    };
  }, [sessionId, logsPath, metricsPath]);

  // Update average durations when durations change
  useEffect(() => {
    if (apiDurations.length > 0) {
      const avg = apiDurations.reduce((sum, d) => sum + d, 0) / apiDurations.length;
      setMetrics((prev) => ({ ...prev, avgApiDuration: avg }));
    }
  }, [apiDurations]);

  useEffect(() => {
    if (toolDurations.length > 0) {
      const avg = toolDurations.reduce((sum, d) => sum + d, 0) / toolDurations.length;
      setMetrics((prev) => ({ ...prev, avgToolDuration: avg }));
    }
  }, [toolDurations]);

  return {
    metrics,
    isConnected,
  };
}
