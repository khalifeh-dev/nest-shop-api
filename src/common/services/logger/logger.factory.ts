import { PinoLoggerService } from './pino/pino.service';
import type { LoggerOptions, LoggerService } from './logger-options.interface';

export class LoggerFactory {
  static create(
    options: LoggerOptions = {},
    context: string = 'App',
  ): LoggerService {
    if (process.env.NODE_ENV === 'test') {
      return new (class implements LoggerService {
        info() {}
        error() {}
        debug() {}
        warn() {}
        trace() {}
        fatal() {}
        child() {
          return this;
        }
      })();
    }

    return new PinoLoggerService(options, context);
  }
}
