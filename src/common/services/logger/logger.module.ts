import { DynamicModule, Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { PinoLoggerService } from './pino/pino.service';
import { LOGGER_CONTEXT, LOGGER_OPTIONS, type LoggerOptions } from './logger-options.interface';
import { LoggerFactory } from './logger.factory';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options: LoggerOptions = {}): DynamicModule {
    return {
      module: LoggerModule,
      providers: [
        {
          provide: LOGGER_OPTIONS,
          useValue: options,
        },
        {
          provide: LOGGER_CONTEXT,
          useValue: 'App',
        },
        PinoLoggerService,
        {
          provide: 'LoggerService',
          useExisting: PinoLoggerService,
        },
      ],
      exports: ['LoggerService'],
    };
  }
}