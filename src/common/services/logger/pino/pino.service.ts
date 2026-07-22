import { Inject, Injectable, Optional } from '@nestjs/common';
import pino, { type Logger as PinoLogger } from 'pino';
import {
  type LoggerService,
  type LoggerOptions,
  Level,
   LOGGER_OPTIONS, LOGGER_CONTEXT
} from '../logger-options.interface';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private logger: PinoLogger;
  private context: string;

  constructor(
    @Optional() @Inject(LOGGER_OPTIONS) options: LoggerOptions = {},
    @Optional() @Inject(LOGGER_CONTEXT) context: string = 'App',
  ) {
    this.context = context;
    this.logger = this.createPinoLogger(options);
  }

  private createPinoLogger(options: LoggerOptions): PinoLogger {
    const level = options.level || 'info';

    const targets: any[] = [];

    if (options.enableConsole !== false) {
      targets.push({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid.hostname',
        },
      });
    }

    if (options.enableFile && options.filePath) {
      targets.push({
        target: 'pino/file',
        options: {
          destination: options.filePath,
          mkdir: true,
        },
      });
    }

    if (options.enableLoki && options.lokiUrl) {
      targets.push({
        target: 'pino-loki',
        options: {
          batching: true,
          interval: 5,
          host: options.lokiUrl,
          labels: { service: options.serviceName || 'nest-app' },
        },
      });
    }

    return pino({
      level: level,
      base: {
        service: options.serviceName || 'nest-app',
        ...options.labels,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      transport: {
        targets,
      },
    });
  }

  public info(message: string, context?: any) {
    this.logger.info({ context: context || this.context }, message);
  }

  public error(message: string, context?: any) {
    this.logger.error({ context: context || this.context }, message);
  }

  public warn(message: string, context?: any) {
    this.logger.warn({ context: context || this.context }, message);
  }

  public debug(message: string, context?: any) {
    this.logger.debug({ context: context || this.context }, message);
  }

  public trace(message: string, context?: any) {
    this.logger.trace({ context: context || this.context }, message);
  }

  public fatal(message: string, context?: any) {
    this.logger.fatal({ context: context || this.context }, message);
  }

  public child(options: Record<string, any>): LoggerService {
    const childLogger = this.logger.child(options);
    const newLogger = new PinoLoggerService();
    (newLogger as any).logger = childLogger;
    return newLogger;
  }
}
