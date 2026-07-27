'use client';

import { toast } from 'sonner';

import { Action, OrgRole } from '@ag2/contracts';
import { useAuth } from '@/lib/auth-context';
import { useOrg } from '@/lib/org-context';
import { useMemberships, useRemoveMembership, useUpdateMembershipRole } from '@/lib/queries/memberships';
import { PageHeader } from '@/components/layout/page-header';
import { AddMemberDialog, ROLE_LABELS } from '@/components/team/add-member-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

function initials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const { organizationId, ability } = useOrg();
  const membershipsQuery = useMemberships(organizationId);
  const updateRole = useUpdateMembershipRole(organizationId);
  const removeMembership = useRemoveMembership(organizationId);

  const canInvite = ability.can(Action.INVITE, 'Membership');
  const canUpdate = ability.can(Action.UPDATE, 'Membership');
  const canRemove = ability.can(Action.REMOVE_MEMBER, 'Membership');

  async function handleRoleChange(membershipId: string, role: OrgRole) {
    try {
      await updateRole.mutateAsync({ membershipId, role });
      toast.success('Role updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role');
    }
  }

  async function handleRemove(membershipId: string) {
    try {
      await removeMembership.mutateAsync(membershipId);
      toast.success('Member removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    }
  }

  return (
    <div>
      <PageHeader
        title="Team"
        description="Everyone with access to this organization."
        action={canInvite ? <AddMemberDialog organizationId={organizationId} /> : undefined}
      />

      <div className="p-8">
        {membershipsQuery.isLoading && <Skeleton className="h-64 w-full" />}

        {membershipsQuery.data && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {membershipsQuery.data.map((membership) => {
                const isSelf = membership.user.id === currentUser?.id;
                return (
                  <TableRow key={membership.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{initials(membership.user.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {membership.user.name} {isSelf && <span className="text-muted-foreground">(you)</span>}
                          </p>
                          <p className="text-muted-foreground text-sm">{membership.user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canUpdate ? (
                        <Select
                          value={membership.role}
                          onValueChange={(role) => handleRoleChange(membership.id, role as OrgRole)}
                        >
                          <SelectTrigger size="sm" className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(OrgRole).map((role) => (
                              <SelectItem key={role} value={role}>
                                {ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{ROLE_LABELS[membership.role]}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {canRemove && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm">
                              Remove
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove {membership.user.name}?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                They&apos;ll immediately lose access to this organization.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRemove(membership.id)}>
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
