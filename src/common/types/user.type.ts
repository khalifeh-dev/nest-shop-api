import { User } from '@prisma/client';

export type SanitizeUser = Omit<
  User,
  'password' | 'createdAt' | 'updatedAt' | 'sellerInfo' | 'sellerVerified' | "deletedAt" | "deleteReason" | "deletedBy" | "isDeleted"
>;

export enum UserStatus {
  Active = 'ACTIVE',
  In_Active = 'INACTIVE',
  Banned = 'BANNED',
}
