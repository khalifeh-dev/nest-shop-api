import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private _master: PrismaClient;
  private _replica: PrismaClient;
  private masterPool: Pool;
  private replicaPool: Pool;
  private isReplicaHealthy: boolean = true;

  constructor() {
    // Master
    this.masterPool = new Pool({
      connectionString: process.env.DATABASE_MASTER_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Replica
    this.replicaPool = new Pool({
      connectionString: process.env.DATABASE_REPLICA_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const masterAdapter = new PrismaPg(this.masterPool);
    const replicaAdapter = new PrismaPg(this.replicaPool);

    this._master = new PrismaClient({
      adapter: masterAdapter,
      log: ['error'],
    });

    this._replica = new PrismaClient({
      adapter: replicaAdapter,
      log: ['error'],
    });
  }

  public async onModuleInit() {
    try {
      await Promise.all([this._master.$connect(), this._replica.$connect()]);
    } catch (error) {
      console.error('Prisma connection error:', error);
      this.isReplicaHealthy = false;
      await this._master.$connect();
    }
  }

  public async onModuleDestroy() {
    await Promise.all([
      this._master.$disconnect(),
      this._replica.$disconnect(),
      this.masterPool.end(),
      this.replicaPool.end(),
    ]);
  }

  // ----------- Access To Master -----------
  get master(): PrismaClient {
    return this._master;
  }

  // ----------- Access To Replica Or Fallback -----------
  get replica(): PrismaClient {
    if (!this.isReplicaHealthy) {
      console.warn('⚠️ Replica is down, falling back to Master');
      return this._master;
    }
    return this._replica;
  }

  public async checkHealth(): Promise<{ master: boolean; replica: boolean }> {
    try {
      await this._master.$queryRaw`SELECT 1`;
      const master = true;

      let replica = false;
      try {
        await this._replica.$queryRaw`SELECT 1`;
        replica = true;
      } catch (e) {
        this.isReplicaHealthy = false;
      }

      return { master, replica };
    } catch (error) {
      return { master: false, replica: false };
    }
  }

  public async transaction<T>(
    callback: (prisma: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this._master.$transaction(callback);
  }
}
