import { Category } from '@prisma/client';

export type CategoryResponse = Omit<
  Category,
  'createdAt' | 'updatedAt' | 'isActive' | "deletedAt" | "isDeleted"
>;

export type CategoryFilter = { isActive: boolean }