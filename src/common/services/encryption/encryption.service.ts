import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ErrorUtil } from '../../utils/error.util';
import type { LoggerService } from '../logger/logger-options.interface';
import crypto from 'crypto';

export interface Argon2Options {
  type?: number; // 0 = Argon2d, 1 = Argon2i, 2 = Argon2id
  hashLength?: number;
  timeCost?: number;
  memoryCost?: number;
  parallelism?: number;
  version?: number;
  salt?: Buffer;
}

@Injectable()
export class EncryptionService {
  constructor(@Inject('LoggerService') private logger: LoggerService) {}

  public async hash(
    value: string,
    options: Argon2Options = {},
  ): Promise<string> {
    try {
      this.logger.info(`🔐 Hasing a value`, 'EncryptionService');
      const defaultOptions: Argon2Options = {
        type: 2, //Argon2id
        hashLength: 32,
        timeCost: 3,
        memoryCost: 2 ** 16, // 65,536 KB = 64 MB
        parallelism: 1,
        version: 0x13,
      };

      const mergedOptions = { ...defaultOptions, ...options };

      // Filter Undefined Value
      const cleanOptions = Object.fromEntries(
        Object.entries(mergedOptions).filter(([_, v]) => v !== undefined),
      );

      return await argon2.hash(value, cleanOptions);
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in hashing value: ${message}`,
        'EncryptionService',
      );
      throw new BadRequestException(`Error In Hashing ❌.`);
    }
  }

  public async verifyHash(
    hashedValue: string,
    plainValue: string,
  ): Promise<boolean> {
    try {
      this.logger.info(`🔐 Verify hashed value`, 'EncryptionService');
      return await argon2.verify(hashedValue, plainValue);
    } catch (error) {
      const message = ErrorUtil.getMessage(error);
      this.logger.error(
        `⛔ Error in verify hashing value: ${message}`,
        'EncryptionService',
      );
      throw new BadRequestException(`Error In Hashing ❌.`);
    }
  }

  public hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
