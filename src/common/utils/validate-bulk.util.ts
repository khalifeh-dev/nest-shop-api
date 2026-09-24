import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class BulkValidator {
  constructor(private prisma: DatabaseService) {}

  public async validateUsers(userIds: string[]) {
    if (!userIds?.length) return;

    const users = await this.prisma.replica.user.findMany({
      where: {
        id: { in: userIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (users.length !== userIds.length) {
      const foundIds = new Set(users.map((u) => u.id));
      const missingIds = userIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Users not found: ${missingIds.join(', ')}`);
    }
  }

  public async validateProducts(productIds: string[]) {
    if (!productIds?.length) return;

    const products = await this.prisma.replica.product.findMany({
      where: {
        id: { in: productIds },
        isDeleted: false,
        isActive: true,
      },
      select: { id: true },
    });

    if (products.length !== productIds.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Products not found or inactive: ${missingIds.join(', ')}`,
      );
    }
  }

  public async validateCategories(categoryIds: string[]) {
    if (!categoryIds?.length) return;

    const categories = await this.prisma.replica.category.findMany({
      where: {
        id: { in: categoryIds },
        isDeleted: false,
      },
      select: { id: true },
    });

    if (categories.length !== categoryIds.length) {
      const foundIds = new Set(categories.map((c) => c.id));
      const missingIds = categoryIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(
        `Categories not found: ${missingIds.join(', ')}`,
      );
    }
  }
}
