type level = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LoggerOptions {
  level?: level;
  prettyPrint?: boolean;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableLoki?: boolean;
  filePath?: string;
  lokiUrl?: string;
  serviceName?: string;
  labels?: Record<string, string>;
}

export interface LoggerService {
  info(message: string, context?: any): void;
  error(message: string, trace?: string, context?: any): void;
  warn(message: string, trace?: string, context?: any): void;
  debug(message: string, trace?: string, context?: any): void;
  trace(message: string, trace?: string, context?: any): void;
  fatal(message: string, trace?: string, context?: any): void;
  child(options: Record<string, any>): LoggerService;
}

export enum Level {
  trace = "trace",
  debug = "debug",
  info = "info",
  warn = "warn",
  error = "error",
  fatal = "fatal",
}

export const LOGGER_OPTIONS = 'LOGGER_OPTIONS';
export const LOGGER_CONTEXT = 'LOGGER_CONTEXT';