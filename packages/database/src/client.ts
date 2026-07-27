import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

export interface PrismaClientOptions {
  readonly databaseUrl: string;
  readonly logQueries?: boolean;
}

export function createPrismaClient(options: PrismaClientOptions): PrismaClient {
  const adapter = new PrismaPg({ connectionString: options.databaseUrl });

  return new PrismaClient({
    adapter,
    log: options.logQueries ? ['query', 'warn', 'error'] : ['warn', 'error'],
  });
}

export type { PrismaClient } from '../generated/prisma/client';
