import {
  BuildArtifactKind as ContractsArtifactKind,
  BuildJobStatus as ContractsJobStatus,
} from '@ag2/contracts';
import {
  BuildArtifactKind as PrismaArtifactKind,
  BuildJobStatus as PrismaJobStatus,
} from '@ag2/database';

export function toPrismaJobStatus(value: ContractsJobStatus): PrismaJobStatus {
  switch (value) {
    case ContractsJobStatus.QUEUED:
      return PrismaJobStatus.QUEUED;
    case ContractsJobStatus.IN_PROGRESS:
      return PrismaJobStatus.IN_PROGRESS;
    case ContractsJobStatus.SUCCEEDED:
      return PrismaJobStatus.SUCCEEDED;
    case ContractsJobStatus.FAILED:
      return PrismaJobStatus.FAILED;
    case ContractsJobStatus.CANCELLED:
      return PrismaJobStatus.CANCELLED;
  }
}

export function toPrismaArtifactKind(value: ContractsArtifactKind): PrismaArtifactKind {
  switch (value) {
    case ContractsArtifactKind.MANIFEST:
      return PrismaArtifactKind.MANIFEST;
    case ContractsArtifactKind.ANDROID_PROJECT:
      return PrismaArtifactKind.ANDROID_PROJECT;
    case ContractsArtifactKind.APK:
      return PrismaArtifactKind.APK;
    case ContractsArtifactKind.AAB:
      return PrismaArtifactKind.AAB;
    case ContractsArtifactKind.IPA:
      return PrismaArtifactKind.IPA;
  }
}
