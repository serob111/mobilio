import {
  AndroidPermission as ContractsPermission,
  ScreenOrientation as ContractsOrientation,
  StatusBarStyle as ContractsStatusBarStyle,
} from '@ag2/contracts';
import {
  AndroidPermission as PrismaPermission,
  ScreenOrientation as PrismaOrientation,
  StatusBarStyle as PrismaStatusBarStyle,
} from '@ag2/database';

export function toContractsOrientation(value: PrismaOrientation): ContractsOrientation {
  switch (value) {
    case PrismaOrientation.PORTRAIT:
      return ContractsOrientation.PORTRAIT;
    case PrismaOrientation.LANDSCAPE:
      return ContractsOrientation.LANDSCAPE;
    case PrismaOrientation.ANY:
      return ContractsOrientation.ANY;
  }
}

export function toContractsStatusBarStyle(value: PrismaStatusBarStyle): ContractsStatusBarStyle {
  switch (value) {
    case PrismaStatusBarStyle.DEFAULT:
      return ContractsStatusBarStyle.DEFAULT;
    case PrismaStatusBarStyle.LIGHT:
      return ContractsStatusBarStyle.LIGHT;
    case PrismaStatusBarStyle.DARK:
      return ContractsStatusBarStyle.DARK;
  }
}

export function toContractsPermission(value: PrismaPermission): ContractsPermission {
  switch (value) {
    case PrismaPermission.CAMERA:
      return ContractsPermission.CAMERA;
    case PrismaPermission.LOCATION:
      return ContractsPermission.LOCATION;
    case PrismaPermission.MICROPHONE:
      return ContractsPermission.MICROPHONE;
    case PrismaPermission.STORAGE:
      return ContractsPermission.STORAGE;
    case PrismaPermission.NOTIFICATIONS:
      return ContractsPermission.NOTIFICATIONS;
  }
}
