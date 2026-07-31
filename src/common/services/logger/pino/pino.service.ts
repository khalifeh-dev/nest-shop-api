import { Inject, Injectable, Optional } from '@nestjs/common';
import pino, { type Logger as PinoLogger } from 'pino';
import {
  type LoggerService,
  type LoggerOptions,
  LOGGER_OPTIONS,
  LOGGER_CONTEXT,
} from '../logger-options.interface';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PinoLoggerService implements LoggerService {
  private logger: PinoLogger;
  private context: string;
  private isProduction: boolean;
  private rotationStream: any;

  constructor(
    @Optional() @Inject(LOGGER_OPTIONS) options: LoggerOptions = {},
    @Optional() @Inject(LOGGER_CONTEXT) context: string = 'App',
  ) {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.context = context;
    this.logger = this.createPinoLogger(options);
  }

  private createPinoLogger(options: LoggerOptions): PinoLogger {
    const level = options.level || 'info';

    const targets: any[] = [];

    if (!options.enableConsole) {
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
      const logDir = path.dirname(options.filePath);
      const logFileName = path.basename(options.filePath);

      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      try {
        const pinoRoll = require('pino-roll');
        const isWindows = process.platform === 'win32';
        const rotationStream = pinoRoll({
          file: options.filePath,
          frequency: options.frequency || 86_400_000,
          maxSize: options.maxSize || '20m',
          maxFiles: options.maxFiles || 10,
          retention: options.retention || '30d',
          compress: options.compress !== false,
          dateFormat: options.dateFormat || 'yyyy.MM.dd',
          symlink: !isWindows,
          mkdir: true,
        });

        targets.push({
          level: level,
          stream: rotationStream,
        });
      } catch (error) {
        console.warn('⚠️ pino-roll failed, using simple file logging');
        const dest = pino.destination({
          dest: options.filePath,
          sync: true,
          mkdir: true,
        });
        targets.push({
          level: level,
          stream: dest,
        });
      }
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
