import { Prisma } from '@prisma/client';

export const softDeleteExtension = Prisma.defineExtension({
  name: 'softDelete',
  model: {
    user: {
      async findMany<T>(this: T, args?: any) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).findMany({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null,
          },
        });
      },
      async findUnique<T>(this: T, args?: any) {
        const context = Prisma.getExtensionContext(this);
        return (context as any).findUnique({
          ...args,
          where: {
            ...args?.where,
            deletedAt: null,
          },
        });
      },
    },
  },
});
