import {
  BuildArtifactType as ContractsArtifactType,
  BuildJobStatus as ContractsJobStatus,
  BuildTargetPlatform as ContractsPlatform,
  ProjectSourceType as ContractsSourceType,
} from '@ag2/contracts';
import {
  BuildArtifactType as PrismaArtifactType,
  BuildJobStatus as PrismaJobStatus,
  BuildTargetPlatform as PrismaPlatform,
  ProjectSourceType as PrismaSourceType,
} from '@ag2/database';
import {
  toContractsJobStatus,
  toContractsSourceType,
  toPrismaArtifactType,
  toPrismaPlatform,
} from './build-enum.mapper';

describe('build-enum.mapper', () => {
  it('maps every contracts BuildTargetPlatform to the matching Prisma value', () => {
    for (const value of Object.values(ContractsPlatform)) {
      expect(toPrismaPlatform(value)).toBe(value as unknown as PrismaPlatform);
    }
  });

  it('maps every contracts BuildArtifactType to the matching Prisma value', () => {
    for (const value of Object.values(ContractsArtifactType)) {
      expect(toPrismaArtifactType(value)).toBe(value as unknown as PrismaArtifactType);
    }
  });

  it('maps every Prisma ProjectSourceType to the matching contracts value', () => {
    for (const value of Object.values(PrismaSourceType)) {
      expect(toContractsSourceType(value)).toBe(value as unknown as ContractsSourceType);
    }
  });

  it('maps every Prisma BuildJobStatus to the matching contracts value', () => {
    for (const value of Object.values(PrismaJobStatus)) {
      expect(toContractsJobStatus(value)).toBe(value as unknown as ContractsJobStatus);
    }
  });
});
