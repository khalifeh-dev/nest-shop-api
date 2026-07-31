import { DynamicModule, Global, Module } from '@nestjs/common';
import { PinoLoggerService } from './pino/pino.service';
import { LOGGER_CONTEXT, LOGGER_OPTIONS, type LoggerOptions } from './logger-options.interface';
import { LoggerService } from './logger.service';

@Global()
@Module({
  providers: [LoggerService]
})
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