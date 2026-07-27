'use client';

import * as React from 'react';
import { ImageIcon, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { useAssetDownloadUrl, useUploadAsset } from '@/lib/queries/project-config';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export function AssetUploadField({
  organizationId,
  projectId,
  kind,
  label,
  hint,
  canEdit,
}: {
  organizationId: string;
  projectId: string;
  kind: 'icon' | 'splash';
  label: string;
  hint: string;
  canEdit: boolean;
}) {
  const downloadQuery = useAssetDownloadUrl(organizationId, projectId, kind);
  const uploadAsset = useUploadAsset(organizationId, projectId);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      await uploadAsset.mutateAsync({ kind, file });
      toast.success(`${label} uploaded`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to upload ${label.toLowerCase()}`);
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-4">
        <div className="border-border bg-muted flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
          {downloadQuery.data?.downloadUrl ? (
            <img
              src={downloadQuery.data.downloadUrl}
              alt={label}
              className="size-full object-contain"
            />
          ) : (
            <ImageIcon className="text-muted-foreground size-6" />
          )}
        </div>
        <div className="space-y-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png"
            className="hidden"
            onChange={handleFileChange}
            disabled={!canEdit || uploadAsset.isPending}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={!canEdit || uploadAsset.isPending}
          >
            {uploadAsset.isPending && <Loader2 className="animate-spin" />}
            Upload PNG
          </Button>
          <p className="text-muted-foreground text-xs">{hint}</p>
        </div>
      </div>
    </div>
  );
}
