import { BuildArtifactKind as ContractsArtifactKind, BuildJobStatus as ContractsJobStatus } from '@ag2/contracts';
import { BuildArtifactKind as PrismaArtifactKind, BuildJobStatus as PrismaJobStatus } from '@ag2/database';
import { toPrismaArtifactKind, toPrismaJobStatus } from './build-enum.mapper';

describe('build-enum.mapper', () => {
  it('maps every contracts job status to its Prisma counterpart', () => {
    for (const status of Object.values(ContractsJobStatus)) {
      expect(toPrismaJobStatus(status)).toBe(PrismaJobStatus[status]);
    }
  });

  it('maps every contracts artifact kind to its Prisma counterpart', () => {
    for (const kind of Object.values(ContractsArtifactKind)) {
      expect(toPrismaArtifactKind(kind)).toBe(PrismaArtifactKind[kind]);
    }
  });
});
