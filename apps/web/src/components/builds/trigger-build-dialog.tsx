'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Hammer, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { BuildArtifactType, BuildTargetPlatform } from '@ag2/contracts';
import { useTriggerBuild } from '@/lib/queries/builds';
import { Build } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ARTIFACT_TYPES_BY_PLATFORM: Record<
  BuildTargetPlatform,
  BuildArtifactType[]
> = {
  [BuildTargetPlatform.ANDROID]: [BuildArtifactType.APK, BuildArtifactType.AAB],
  [BuildTargetPlatform.IOS]: [BuildArtifactType.IPA],
};

// iOS builds are rejected server-side until that pipeline ships (v4.0) —
// Android is the only selectable platform for now rather than offering a
// choice that always 400s.

const triggerBuildSchema = z.object({
  platform: z.nativeEnum(BuildTargetPlatform),
  artifactType: z.nativeEnum(BuildArtifactType),
});

type TriggerBuildValues = z.infer<typeof triggerBuildSchema>;

export function TriggerBuildDialog({
  organizationId,
  projectId,
  onTriggered,
}: {
  organizationId: string;
  projectId: string;
  onTriggered?: (build: Build) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const triggerBuild = useTriggerBuild(organizationId, projectId);

  const form = useForm<TriggerBuildValues>({
    resolver: zodResolver(triggerBuildSchema),
    defaultValues: {
      platform: BuildTargetPlatform.ANDROID,
      artifactType: BuildArtifactType.APK,
    },
  });

  const availableArtifactTypes = ARTIFACT_TYPES_BY_PLATFORM[BuildTargetPlatform.ANDROID];

  async function onSubmit(values: TriggerBuildValues) {
    try {
      const build = await triggerBuild.mutateAsync(values);
      toast.success('Build queued');
      form.reset();
      setOpen(false);
      onTriggered?.(build);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to trigger build',
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Hammer />
          Trigger build
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Trigger a build</DialogTitle>
          <DialogDescription>
            Validates the project&apos;s source and produces a build manifest
            artifact.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <div className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                Android
                <span className="text-muted-foreground text-xs">
                  iOS builds ship in a later milestone
                </span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="artifactType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Artifact type</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableArtifactTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" disabled={triggerBuild.isPending}>
                {triggerBuild.isPending && <Loader2 className="animate-spin" />}
                Trigger build
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
