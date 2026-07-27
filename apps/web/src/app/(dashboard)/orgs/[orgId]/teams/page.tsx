'use client';

import { toast } from 'sonner';
import { UsersRound } from 'lucide-react';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useDeleteTeam, useTeams } from '@/lib/queries/teams';
import { PageHeader } from '@/components/layout/page-header';
import { CreateTeamDialog } from '@/components/team/create-team-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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

export default function TeamsPage() {
  const { organizationId, ability } = useOrg();
  const teamsQuery = useTeams(organizationId);
  const deleteTeam = useDeleteTeam(organizationId);

  const canCreate = ability.can(Action.CREATE, 'Team');
  const canDelete = ability.can(Action.DELETE, 'Team');

  async function handleDelete(teamId: string) {
    try {
      await deleteTeam.mutateAsync(teamId);
      toast.success('Team deleted');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete team');
    }
  }

  return (
    <div>
      <PageHeader
        title="Teams"
        description="Sub-groups within your organization."
        action={canCreate ? <CreateTeamDialog organizationId={organizationId} /> : undefined}
      />

      <div className="p-8">
        {teamsQuery.isLoading && <Skeleton className="h-32 w-full" />}

        {teamsQuery.data && teamsQuery.data.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <UsersRound className="text-muted-foreground size-8" />
            <div>
              <p className="font-medium">No teams yet</p>
              <p className="text-muted-foreground text-sm">
                Teams let you group members for scoped access down the line.
              </p>
            </div>
          </div>
        )}

        {teamsQuery.data && teamsQuery.data.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {teamsQuery.data.map((team) => (
              <Card key={team.id}>
                <CardContent className="flex items-center justify-between">
                  <span className="font-medium">{team.name}</span>
                  {canDelete && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Delete
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &ldquo;{team.name}&rdquo;?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Members of this team keep their organization access; they&apos;ll
                            just no longer belong to this team.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(team.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
