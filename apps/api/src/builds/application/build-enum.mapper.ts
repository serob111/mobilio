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

export function toPrismaPlatform(value: ContractsPlatform): PrismaPlatform {
  switch (value) {
    case ContractsPlatform.ANDROID:
      return PrismaPlatform.ANDROID;
    case ContractsPlatform.IOS:
      return PrismaPlatform.IOS;
  }
}

export function toPrismaArtifactType(value: ContractsArtifactType): PrismaArtifactType {
  switch (value) {
    case ContractsArtifactType.APK:
      return PrismaArtifactType.APK;
    case ContractsArtifactType.AAB:
      return PrismaArtifactType.AAB;
    case ContractsArtifactType.IPA:
      return PrismaArtifactType.IPA;
  }
}

export function toContractsSourceType(value: PrismaSourceType): ContractsSourceType {
  switch (value) {
    case PrismaSourceType.URL:
      return ContractsSourceType.URL;
    case PrismaSourceType.UPLOAD:
      return ContractsSourceType.UPLOAD;
  }
}

export function toContractsJobStatus(value: PrismaJobStatus): ContractsJobStatus {
  switch (value) {
    case PrismaJobStatus.QUEUED:
      return ContractsJobStatus.QUEUED;
    case PrismaJobStatus.IN_PROGRESS:
      return ContractsJobStatus.IN_PROGRESS;
    case PrismaJobStatus.SUCCEEDED:
      return ContractsJobStatus.SUCCEEDED;
    case PrismaJobStatus.FAILED:
      return ContractsJobStatus.FAILED;
    case PrismaJobStatus.CANCELLED:
      return ContractsJobStatus.CANCELLED;
  }
}
