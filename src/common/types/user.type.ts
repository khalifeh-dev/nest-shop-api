import { User } from '@prisma/client';

export type SanitizeUser = Omit<
  User,
  'password' | 'createdAt' | 'updatedAt' | 'sellerInfo' | 'sellerVerified'
>;

export enum UserStatus {
  Active = 'ACTIVE',
  In_Active = 'INACTIVE',
  Banned = 'BANNED',
}
