type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

function formatLog(level: LogLevel, message: string, context?: unknown): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
  return `[${timestamp}] [${level}] ${message}${contextStr}`;
}

export const logger = {
  info: (message: string, context?: unknown) => {
    console.log(formatLog('INFO', message, context));
  },
  warn: (message: string, context?: unknown) => {
    console.warn(formatLog('WARN', message, context));
  },
  error: (message: string, context?: unknown) => {
    console.error(formatLog('ERROR', message, context));
  },
  debug: (message: string, context?: unknown) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(formatLog('DEBUG', message, context));
    }
  },
};
