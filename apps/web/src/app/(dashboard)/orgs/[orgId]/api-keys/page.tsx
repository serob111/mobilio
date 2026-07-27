'use client';

import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';

import { Action } from '@ag2/contracts';
import { useOrg } from '@/lib/org-context';
import { useApiKeys, useRevokeApiKey } from '@/lib/queries/api-keys';
import { PageHeader } from '@/components/layout/page-header';
import { CreateApiKeyDialog } from '@/components/api-keys/create-api-key-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

export default function ApiKeysPage() {
  const { organizationId, ability } = useOrg();
  const apiKeysQuery = useApiKeys(organizationId);
  const revokeApiKey = useRevokeApiKey(organizationId);

  const canCreate = ability.can(Action.CREATE, 'ApiKey');
  const canRevoke = ability.can(Action.DELETE, 'ApiKey');

  async function handleRevoke(apiKeyId: string) {
    try {
      await revokeApiKey.mutateAsync(apiKeyId);
      toast.success('API key revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke API key');
    }
  }

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Scoped credentials for integrations. Reserved for CI/CLI use in a future milestone."
        action={canCreate ? <CreateApiKeyDialog organizationId={organizationId} /> : undefined}
      />

      <div className="p-8">
        {apiKeysQuery.isLoading && <Skeleton className="h-48 w-full" />}

        {apiKeysQuery.data && apiKeysQuery.data.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
            <KeyRound className="text-muted-foreground size-8" />
            <p className="font-medium">No API keys yet</p>
          </div>
        )}

        {apiKeysQuery.data && apiKeysQuery.data.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Last used</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeysQuery.data.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell className="font-mono text-sm">{key.keyPrefix}…</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {key.revokedAt
                      ? 'Revoked'
                      : key.lastUsedAt
                        ? new Date(key.lastUsedAt).toLocaleDateString()
                        : 'Never'}
                  </TableCell>
                  <TableCell>
                    {canRevoke && !key.revokedAt && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Revoke
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke &ldquo;{key.name}&rdquo;?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Any integration using this key will immediately stop working.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRevoke(key.id)}>
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
