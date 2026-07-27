'use client';

import * as React from 'react';
import { Download, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

import {
  useDownloadSigningKeyBackup,
  useRegenerateSigningKey,
  useSigningKey,
} from '@/lib/queries/signing-key';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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

export function ProjectSigningPanel({
  organizationId,
  projectId,
  canEdit,
}: {
  organizationId: string;
  projectId: string;
  canEdit: boolean;
}) {
  const signingKeyQuery = useSigningKey(organizationId, projectId);
  const regenerate = useRegenerateSigningKey(organizationId, projectId);
  const downloadBackup = useDownloadSigningKeyBackup(organizationId, projectId);

  if (signingKeyQuery.isLoading) {
    return <Skeleton className="h-64 w-full max-w-xl" />;
  }

  if (!signingKeyQuery.data) {
    return <p className="text-muted-foreground text-sm">Signing key not found.</p>;
  }

  const signingKey = signingKeyQuery.data;

  async function handleDownloadBackup() {
    try {
      await downloadBackup.mutateAsync();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to download keystore backup',
      );
    }
  }

  async function handleRegenerate() {
    try {
      await regenerate.mutateAsync();
      toast.success('Signing key regenerated');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to regenerate signing key',
      );
    }
  }

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="text-muted-foreground size-4" />
          Signing
        </CardTitle>
        <CardDescription>
          Every release APK/AAB is signed with a real, per-project keystore, generated
          automatically and encrypted at rest. Download a backup and keep it somewhere safe — you
          need the exact same key to publish updates to an app already on the Play Store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Key alias</Label>
          <p className="text-sm">{signingKey.alias}</p>
        </div>
        <div className="space-y-2">
          <Label>SHA-256 certificate fingerprint</Label>
          <p className="font-mono text-xs break-all">{signingKey.sha256Fingerprint}</p>
        </div>
        <div className="space-y-2">
          <Label>Created</Label>
          <p className="text-muted-foreground text-sm">
            {new Date(signingKey.createdAt).toLocaleString()}
          </p>
        </div>
      </CardContent>
      <CardFooter className="justify-between">
        <Button
          variant="outline"
          onClick={handleDownloadBackup}
          disabled={downloadBackup.isPending}
        >
          {downloadBackup.isPending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Download />
          )}
          Download backup
        </Button>

        {canEdit && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Regenerate key</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Regenerate the signing key?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently replaces the keystore. Any build already published to the Play
                  Store under the current key will no longer accept updates signed with the new
                  one — there is no way to undo this. Download a backup first if you might need
                  the current key again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRegenerate}>Regenerate</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </CardFooter>
    </Card>
  );
}
