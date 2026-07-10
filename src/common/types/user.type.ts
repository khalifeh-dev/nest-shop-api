import { User } from "@prisma/client";

export type SanitizeUser = Omit<
  User,
  | 'password'
  | 'createdAt'
  | 'updatedAt'
  | 'sellerInfo'
  | 'sellerVerified'
>;