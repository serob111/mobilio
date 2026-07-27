import { ProjectSourceType as ContractsSourceType, ProjectStatus as ContractsStatus } from '@ag2/contracts';
import { ProjectSourceType as PrismaSourceType, ProjectStatus as PrismaStatus } from '@ag2/database';
import { toPrismaSourceType, toPrismaStatus } from './project-enum.mapper';

describe('project-enum.mapper', () => {
  it('maps every contracts ProjectSourceType to the matching Prisma value', () => {
    for (const value of Object.values(ContractsSourceType)) {
      expect(toPrismaSourceType(value)).toBe(value as unknown as PrismaSourceType);
    }
  });

  it('maps every contracts ProjectStatus to the matching Prisma value', () => {
    for (const value of Object.values(ContractsStatus)) {
      expect(toPrismaStatus(value)).toBe(value as unknown as PrismaStatus);
    }
  });
});
