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

export function toPrismaOrientation(value: ContractsOrientation): PrismaOrientation {
  switch (value) {
    case ContractsOrientation.PORTRAIT:
      return PrismaOrientation.PORTRAIT;
    case ContractsOrientation.LANDSCAPE:
      return PrismaOrientation.LANDSCAPE;
    case ContractsOrientation.ANY:
      return PrismaOrientation.ANY;
  }
}

export function toPrismaStatusBarStyle(value: ContractsStatusBarStyle): PrismaStatusBarStyle {
  switch (value) {
    case ContractsStatusBarStyle.DEFAULT:
      return PrismaStatusBarStyle.DEFAULT;
    case ContractsStatusBarStyle.LIGHT:
      return PrismaStatusBarStyle.LIGHT;
    case ContractsStatusBarStyle.DARK:
      return PrismaStatusBarStyle.DARK;
  }
}

export function toPrismaPermission(value: ContractsPermission): PrismaPermission {
  switch (value) {
    case ContractsPermission.CAMERA:
      return PrismaPermission.CAMERA;
    case ContractsPermission.LOCATION:
      return PrismaPermission.LOCATION;
    case ContractsPermission.MICROPHONE:
      return PrismaPermission.MICROPHONE;
    case ContractsPermission.STORAGE:
      return PrismaPermission.STORAGE;
    case ContractsPermission.NOTIFICATIONS:
      return PrismaPermission.NOTIFICATIONS;
  }
}
