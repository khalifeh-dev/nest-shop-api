import { BadRequestException, Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { ErrorUtil } from '../../utils/error.util';

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
  public async hashPassword(
    password: string,
    options: Argon2Options = {},
  ): Promise<string> {
    try {
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

      return await argon2.hash(password, cleanOptions);
    } catch (error) {
      const errorMessage = ErrorUtil.getMessage(error);
      console.log(`❌ Error(hashPassword): ${errorMessage} ❌`);
      throw new BadRequestException(`Error In Hashing Password ❌.`);
    }
  }

  public async verifyPassword(
    hashedPassword: string,
    plainPassword: string,
  ): Promise<boolean> {
    try {
      return await argon2.verify(hashedPassword, plainPassword);
    } catch (error) {
      const errorMessage = ErrorUtil.getMessage(error);
      console.log(`❌ Error(hashPassword): ${errorMessage} ❌`);
      throw new BadRequestException(`Error In Hashing Password ❌.`);
    }
  }
}
