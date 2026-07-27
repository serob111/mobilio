import { ProjectSourceType as ContractsSourceType, ProjectStatus as ContractsStatus } from '@ag2/contracts';
import { ProjectSourceType as PrismaSourceType, ProjectStatus as PrismaStatus } from '@ag2/database';

export function toPrismaSourceType(value: ContractsSourceType): PrismaSourceType {
  switch (value) {
    case ContractsSourceType.URL:
      return PrismaSourceType.URL;
    case ContractsSourceType.UPLOAD:
      return PrismaSourceType.UPLOAD;
  }
}

export function toPrismaStatus(value: ContractsStatus): PrismaStatus {
  switch (value) {
    case ContractsStatus.DRAFT:
      return PrismaStatus.DRAFT;
    case ContractsStatus.ACTIVE:
      return PrismaStatus.ACTIVE;
    case ContractsStatus.ARCHIVED:
      return PrismaStatus.ARCHIVED;
  }
}
