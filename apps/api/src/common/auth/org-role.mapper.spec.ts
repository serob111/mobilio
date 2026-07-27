import { OrgRole as ContractsOrgRole } from '@ag2/contracts';
import { OrgRole as PrismaOrgRole } from '@ag2/database';
import { toContractsOrgRole, toPrismaOrgRole } from './org-role.mapper';

describe('org-role.mapper', () => {
  it('maps every Prisma OrgRole to the matching contracts OrgRole', () => {
    for (const role of Object.values(PrismaOrgRole)) {
      expect(toContractsOrgRole(role)).toBe(role);
    }
  });

  it('maps every contracts OrgRole to the matching Prisma OrgRole', () => {
    for (const role of Object.values(ContractsOrgRole)) {
      expect(toPrismaOrgRole(role)).toBe(role);
    }
  });

  it('round-trips through both mappers without loss', () => {
    for (const role of Object.values(ContractsOrgRole)) {
      expect(toContractsOrgRole(toPrismaOrgRole(role))).toBe(role);
    }
  });
});
