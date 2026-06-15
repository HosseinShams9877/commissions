/**
 * Simple structured logger with timestamps and object serialization.
 * In production, this could be replaced with an external logging service
 * (e.g., Winston, Pino, Datadog, Sentry).
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: unknown;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function createLogEntry(level: LogLevel, message: string, data?: unknown): LogEntry {
  const entry: LogEntry = {
    level,
    message,
    timestamp: formatTimestamp(),
  };

  if (data !== undefined) {
    entry.data = data;
  }

  return entry;
}

function serializeData(data: unknown): string {
  if (data === undefined) return '';
  if (data instanceof Error) {
    return JSON.stringify({
      name: data.name,
      message: data.message,
      stack: data.stack,
    }, null, 2);
  }
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function formatLogMessage(entry: LogEntry): string {
  const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
  const serialized = serializeData(entry.data);
  return serialized ? `${prefix} ${entry.message}\n${serialized}` : `${prefix} ${entry.message}`;
}

export const logger = {
  info(message: string, data?: unknown): void {
    const entry = createLogEntry('info', message, data);
    console.log(formatLogMessage(entry));
  },

  warn(message: string, data?: unknown): void {
    const entry = createLogEntry('warn', message, data);
    console.warn(formatLogMessage(entry));
  },

  error(message: string, data?: unknown): void {
    const entry = createLogEntry('error', message, data);
    console.error(formatLogMessage(entry));
  },
} as const;

export default logger;
