import React from 'react';
import { Box, Text } from 'ink';
import { colors, inkColors } from '../theme/colors.js';
import { MetricsSummary } from '../state/useOtelMetrics.js';

interface OtelDashboardProps {
  metrics: MetricsSummary;
  isConnected: boolean;
}

export const OtelDashboard: React.FC<OtelDashboardProps> = ({ metrics, isConnected }) => {
  const formatCost = (cost: number): string => {
    return `$${cost.toFixed(4)}`;
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatDuration = (ms: number): string => {
    if (ms >= 1000) {
      return `${(ms / 1000).toFixed(2)}s`;
    }
    return `${Math.round(ms)}ms`;
  };

  const formatTime = (seconds: number): string => {
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${mins}m`;
    }
    if (seconds >= 60) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}m ${secs}s`;
    }
    return `${Math.floor(seconds)}s`;
  };

  const getSuccessRate = (): string => {
    const total = metrics.toolExecutions;
    if (total === 0) return 'N/A';
    const rate = (metrics.toolSuccesses / total) * 100;
    return `${rate.toFixed(1)}%`;
  };

  const getCacheHitRate = (): string => {
    const totalTokens =
      metrics.totalInputTokens + metrics.totalCacheReadTokens + metrics.totalCacheCreationTokens;
    if (totalTokens === 0) return 'N/A';
    const rate = (metrics.totalCacheReadTokens / totalTokens) * 100;
    return `${rate.toFixed(1)}%`;
  };

  return (
    <Box flexDirection="column" paddingX={2} paddingY={1}>
      {/* Header */}
      <Box marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          OpenTelemetry Metrics Dashboard
        </Text>
        <Text color={inkColors.dim}> {isConnected ? colors.success(' ● Connected') : colors.dim(' ○ Disconnected')}</Text>
      </Box>

      {/* Session Overview */}
      <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1} marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Session Overview
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Total Cost:</Text>
            </Box>
            <Text bold color={inkColors.warning}>
              {formatCost(metrics.totalCost)}
            </Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Active Time:</Text>
            </Box>
            <Text>{formatTime(metrics.activeTimeSeconds)}</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>API Requests:</Text>
            </Box>
            <Text>
              {colors.success(metrics.apiRequestCount.toString())} / {colors.error(metrics.apiErrorCount.toString())}{' '}
              errors
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Token Usage */}
      <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1} marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Token Usage
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Input:</Text>
            </Box>
            <Text>{formatNumber(metrics.totalInputTokens)} tokens</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Output:</Text>
            </Box>
            <Text>{formatNumber(metrics.totalOutputTokens)} tokens</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Cache Read:</Text>
            </Box>
            <Text color={inkColors.success}>{formatNumber(metrics.totalCacheReadTokens)} tokens</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Cache Creation:</Text>
            </Box>
            <Text>{formatNumber(metrics.totalCacheCreationTokens)} tokens</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Cache Hit Rate:</Text>
            </Box>
            <Text bold color={inkColors.success}>
              {getCacheHitRate()}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Performance */}
      <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1} marginBottom={1}>
        <Text bold color={inkColors.borderAccent}>
          Performance
        </Text>
        <Box marginTop={1} flexDirection="column">
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Avg API Latency:</Text>
            </Box>
            <Text>{formatDuration(metrics.avgApiDuration)}</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Avg Tool Duration:</Text>
            </Box>
            <Text>{formatDuration(metrics.avgToolDuration)}</Text>
          </Box>
          <Box>
            <Box width={20}>
              <Text color={inkColors.dim}>Tool Success Rate:</Text>
            </Box>
            <Text>{getSuccessRate()}</Text>
          </Box>
        </Box>
      </Box>

      {/* Code Impact */}
      {(metrics.linesAdded > 0 || metrics.linesRemoved > 0 || metrics.commitsCreated > 0 || metrics.pullRequestsCreated > 0) && (
        <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Code Impact
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Box>
              <Box width={20}>
                <Text color={inkColors.dim}>Lines Added:</Text>
              </Box>
              <Text color={inkColors.success}>+{formatNumber(metrics.linesAdded)}</Text>
            </Box>
            <Box>
              <Box width={20}>
                <Text color={inkColors.dim}>Lines Removed:</Text>
              </Box>
              <Text color={inkColors.error}>-{formatNumber(metrics.linesRemoved)}</Text>
            </Box>
            <Box>
              <Box width={20}>
                <Text color={inkColors.dim}>Commits:</Text>
              </Box>
              <Text>{metrics.commitsCreated}</Text>
            </Box>
            <Box>
              <Box width={20}>
                <Text color={inkColors.dim}>Pull Requests:</Text>
              </Box>
              <Text>{metrics.pullRequestsCreated}</Text>
            </Box>
          </Box>
        </Box>
      )}

      {/* Model Breakdown */}
      {Object.keys(metrics.modelUsage).length > 0 && (
        <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1} marginBottom={1}>
          <Text bold color={inkColors.borderAccent}>
            Model Usage
          </Text>
          <Box marginTop={1} flexDirection="column">
            {Object.entries(metrics.modelUsage).map(([model, usage]) => (
              <Box key={model}>
                <Box width={30}>
                  <Text color={inkColors.dim}>{model}:</Text>
                </Box>
                <Text>
                  {usage.count} calls, {formatCost(usage.cost)}, {formatNumber(usage.tokens)} tokens
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Recent API Requests */}
      {metrics.recentAPIRequests.length > 0 && (
        <Box borderStyle="round" borderColor={inkColors.border} flexDirection="column" paddingX={2} paddingY={1}>
          <Text bold color={inkColors.borderAccent}>
            Recent API Requests
          </Text>
          <Box marginTop={1} flexDirection="column">
            {metrics.recentAPIRequests.slice(0, 5).map((req, idx) => (
              <Box key={req.id}>
                <Text color={inkColors.dim}>{idx + 1}. </Text>
                <Box width={25}>
                  <Text>{req.model}</Text>
                </Box>
                <Box width={10}>
                  <Text color={inkColors.warning}>{formatCost(req.cost)}</Text>
                </Box>
                <Box width={15}>
                  <Text color={inkColors.dim}>{formatDuration(req.durationMs)}</Text>
                </Box>
                <Text color={inkColors.dim}>
                  {formatNumber(req.inputTokens)}→{formatNumber(req.outputTokens)}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Help hint */}
      <Box marginTop={1}>
        <Text color={inkColors.dim}>Press </Text>
        <Text bold>[d]</Text>
        <Text color={inkColors.dim}> to return to event list</Text>
      </Box>
    </Box>
  );
};
