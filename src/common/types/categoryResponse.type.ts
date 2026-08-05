import { Category } from '@prisma/client';

export type CategoryResponse = Omit<
  Category,
  'createdAt' | 'updatedAt' | 'isActive'
>;

export type CategoryFilter = { isActive: boolean }