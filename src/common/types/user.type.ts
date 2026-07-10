import { User } from "@prisma/client";

export type SanitizeUser = Omit<
  User,
  | 'password'
  | 'createdAt'
  | 'updatedAt'
  | 'refreshTokens'
  | 'sellerInfo'
  | 'sellerVerified'
>;