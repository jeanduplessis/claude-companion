/**
 * OTLP (OpenTelemetry Protocol) JSON Parser
 * Parses OTLP JSON format from OpenTelemetry Collector file exporter
 */

// OTLP attribute value types
interface OTLPValue {
  stringValue?: string;
  intValue?: number;
  doubleValue?: number;
  boolValue?: boolean;
  arrayValue?: { values: OTLPValue[] };
  kvlistValue?: { values: OTLPKeyValue[] };
}

interface OTLPKeyValue {
  key: string;
  value: OTLPValue;
}

// OTLP resource and attributes
interface OTLPResource {
  attributes: OTLPKeyValue[];
}

// OTLP Log structures
interface OTLPLogRecord {
  timeUnixNano: string;
  observedTimeUnixNano?: string;
  severityNumber?: number;
  severityText?: string;
  body?: OTLPValue;
  attributes: OTLPKeyValue[];
  droppedAttributesCount?: number;
  traceId?: string;
  spanId?: string;
}

interface OTLPScopeLogs {
  scope?: {
    name: string;
    version?: string;
  };
  logRecords: OTLPLogRecord[];
}

interface OTLPResourceLogs {
  resource: OTLPResource;
  scopeLogs: OTLPScopeLogs[];
}

export interface OTLPLogsPayload {
  resourceLogs: OTLPResourceLogs[];
}

// OTLP Metrics structures
interface OTLPDataPoint {
  attributes: OTLPKeyValue[];
  timeUnixNano?: string;
  startTimeUnixNano?: string;
  asDouble?: number;
  asInt?: number;
}

interface OTLPMetric {
  name: string;
  description?: string;
  unit?: string;
  sum?: {
    dataPoints: OTLPDataPoint[];
    aggregationTemporality?: number;
    isMonotonic?: boolean;
  };
  gauge?: {
    dataPoints: OTLPDataPoint[];
  };
  histogram?: {
    dataPoints: OTLPDataPoint[];
    aggregationTemporality?: number;
  };
}

interface OTLPScopeMetrics {
  scope?: {
    name: string;
    version?: string;
  };
  metrics: OTLPMetric[];
}

interface OTLPResourceMetrics {
  resource: OTLPResource;
  scopeMetrics: OTLPScopeMetrics[];
}

export interface OTLPMetricsPayload {
  resourceMetrics: OTLPResourceMetrics[];
}

// Parsed output types
export interface ParsedOTelLog {
  timestamp: Date;
  eventName: string;
  sessionId?: string;
  resourceAttributes: Record<string, string | number | boolean>;
  logAttributes: Record<string, string | number | boolean>;
}

export interface ParsedOTelMetric {
  timestamp?: Date;
  metricName: string;
  value: number;
  unit?: string;
  sessionId?: string;
  resourceAttributes: Record<string, string | number | boolean>;
  metricAttributes: Record<string, string | number | boolean>;
}

/**
 * Extract simple value from OTLP value type
 */
function extractValue(value: OTLPValue): string | number | boolean | unknown {
  if (value.stringValue !== undefined) return value.stringValue;
  if (value.intValue !== undefined) return value.intValue;
  if (value.doubleValue !== undefined) return value.doubleValue;
  if (value.boolValue !== undefined) return value.boolValue;
  if (value.arrayValue) {
    return value.arrayValue.values.map(extractValue);
  }
  if (value.kvlistValue) {
    const obj: Record<string, unknown> = {};
    for (const kv of value.kvlistValue.values) {
      obj[kv.key] = extractValue(kv.value);
    }
    return obj;
  }
  return undefined;
}

/**
 * Flatten OTLP attributes to simple key-value object
 */
export function extractAttributes(attributes: OTLPKeyValue[]): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const attr of attributes) {
    const value = extractValue(attr.value);
    // Only include simple types
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[attr.key] = value;
    }
  }
  return result;
}

/**
 * Convert Unix nanoseconds timestamp to Date
 */
function nanoToDate(nanoStr: string): Date {
  const nanos = BigInt(nanoStr);
  const millis = Number(nanos / BigInt(1000000));
  return new Date(millis);
}

/**
 * Parse OTLP log record
 */
export function parseOTLPLog(payload: OTLPLogsPayload): ParsedOTelLog[] {
  const logs: ParsedOTelLog[] = [];

  for (const resourceLog of payload.resourceLogs) {
    const resourceAttributes = extractAttributes(resourceLog.resource.attributes);
    const sessionId = resourceAttributes['session.id'] as string | undefined;

    for (const scopeLog of resourceLog.scopeLogs) {
      for (const logRecord of scopeLog.logRecords) {
        const logAttributes = extractAttributes(logRecord.attributes);
        const eventName = logRecord.body?.stringValue || 'unknown';
        const timestamp = nanoToDate(logRecord.timeUnixNano);

        logs.push({
          timestamp,
          eventName,
          sessionId,
          resourceAttributes,
          logAttributes,
        });
      }
    }
  }

  return logs;
}

/**
 * Parse OTLP metrics
 */
export function parseOTLPMetric(payload: OTLPMetricsPayload): ParsedOTelMetric[] {
  const metrics: ParsedOTelMetric[] = [];

  for (const resourceMetric of payload.resourceMetrics) {
    const resourceAttributes = extractAttributes(resourceMetric.resource.attributes);
    const sessionId = resourceAttributes['session.id'] as string | undefined;

    for (const scopeMetric of resourceMetric.scopeMetrics) {
      for (const metric of scopeMetric.metrics) {
        const metricName = metric.name;
        const unit = metric.unit;

        // Handle different metric types
        let dataPoints: OTLPDataPoint[] = [];
        if (metric.sum) {
          dataPoints = metric.sum.dataPoints;
        } else if (metric.gauge) {
          dataPoints = metric.gauge.dataPoints;
        } else if (metric.histogram) {
          dataPoints = metric.histogram.dataPoints;
        }

        for (const dataPoint of dataPoints) {
          const metricAttributes = extractAttributes(dataPoint.attributes);
          const value = dataPoint.asDouble ?? dataPoint.asInt ?? 0;
          const timestamp = dataPoint.timeUnixNano ? nanoToDate(dataPoint.timeUnixNano) : undefined;

          metrics.push({
            timestamp,
            metricName,
            value,
            unit,
            sessionId,
            resourceAttributes,
            metricAttributes,
          });
        }
      }
    }
  }

  return metrics;
}

/**
 * Parse a single line of JSONL (OTLP format) - logs
 */
export function parseOTLPLogLine(line: string): ParsedOTelLog[] {
  try {
    const payload = JSON.parse(line) as OTLPLogsPayload;
    return parseOTLPLog(payload);
  } catch (error) {
    console.error('Failed to parse OTLP log line:', error);
    return [];
  }
}

/**
 * Parse a single line of JSONL (OTLP format) - metrics
 */
export function parseOTLPMetricLine(line: string): ParsedOTelMetric[] {
  try {
    const payload = JSON.parse(line) as OTLPMetricsPayload;
    return parseOTLPMetric(payload);
  } catch (error) {
    console.error('Failed to parse OTLP metric line:', error);
    return [];
  }
}
