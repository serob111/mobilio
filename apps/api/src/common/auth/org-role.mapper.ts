import { OrgRole as ContractsOrgRole } from '@ag2/contracts';
import { OrgRole as PrismaOrgRole } from '@ag2/database';

/**
 * Prisma's generated OrgRole enum and the framework-agnostic OrgRole enum
 * in packages/contracts have identical string values but are distinct
 * nominal TS types. This is the anti-corruption boundary between the
 * persistence layer and the domain/application layers — an explicit,
 * exhaustively-checked mapping rather than a blind cast.
 */
export function toContractsOrgRole(role: PrismaOrgRole): ContractsOrgRole {
  switch (role) {
    case PrismaOrgRole.OWNER:
      return ContractsOrgRole.OWNER;
    case PrismaOrgRole.ADMIN:
      return ContractsOrgRole.ADMIN;
    case PrismaOrgRole.DEVELOPER:
      return ContractsOrgRole.DEVELOPER;
    case PrismaOrgRole.BILLING:
      return ContractsOrgRole.BILLING;
    case PrismaOrgRole.VIEWER:
      return ContractsOrgRole.VIEWER;
  }
}

export function toPrismaOrgRole(role: ContractsOrgRole): PrismaOrgRole {
  switch (role) {
    case ContractsOrgRole.OWNER:
      return PrismaOrgRole.OWNER;
    case ContractsOrgRole.ADMIN:
      return PrismaOrgRole.ADMIN;
    case ContractsOrgRole.DEVELOPER:
      return PrismaOrgRole.DEVELOPER;
    case ContractsOrgRole.BILLING:
      return PrismaOrgRole.BILLING;
    case ContractsOrgRole.VIEWER:
      return PrismaOrgRole.VIEWER;
  }
}
