'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ProjectSourceType } from '@ag2/contracts';
import { useCreateProject } from '@/lib/queries/projects';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { PhonePreview } from './phone-preview';

const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  sourceType: z.nativeEnum(ProjectSourceType),
  sourceUrl: z.string().optional(),
});

type CreateProjectValues = z.infer<typeof createProjectSchema>;

export function CreateProjectDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = React.useState(false);
  const createProject = useCreateProject(organizationId);

  const form = useForm<CreateProjectValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: { name: '', sourceType: ProjectSourceType.URL, sourceUrl: '' },
  });

  const sourceType = form.watch('sourceType');
  const sourceUrl = form.watch('sourceUrl');

  async function onSubmit(values: CreateProjectValues) {
    if (values.sourceType === ProjectSourceType.URL) {
      if (!values.sourceUrl || !/^https?:\/\/.+/.test(values.sourceUrl)) {
        form.setError('sourceUrl', { message: 'Enter a valid URL, including https://' });
        return;
      }
    }

    try {
      await createProject.mutateAsync({
        name: values.name,
        sourceType: values.sourceType,
        sourceUrl: values.sourceType === ProjectSourceType.URL ? values.sourceUrl : undefined,
      });
      toast.success('Project created');
      form.reset();
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create project');
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New project
        </Button>
      </DialogTrigger>
      <DialogContent className={sourceType === ProjectSourceType.URL ? 'sm:max-w-2xl' : undefined}>
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Turn a website into a native app, or upload a static build.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div
              className={
                sourceType === ProjectSourceType.URL
                  ? 'grid gap-6 sm:grid-cols-[1fr_auto]'
                  : undefined
              }
            >
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Project name</FormLabel>
                      <FormControl>
                        <Input placeholder="My Website" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sourceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Source</FormLabel>
                      <Tabs value={field.value} onValueChange={field.onChange}>
                        <TabsList className="w-full">
                          <TabsTrigger value={ProjectSourceType.URL} className="flex-1">
                            Website URL
                          </TabsTrigger>
                          <TabsTrigger value={ProjectSourceType.UPLOAD} className="flex-1">
                            Upload
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormItem>
                  )}
                />

                {sourceType === ProjectSourceType.URL ? (
                  <FormField
                    control={form.control}
                    name="sourceUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="bg-muted text-muted-foreground rounded-md p-3 text-sm">
                    Uploading a static build isn&apos;t available yet — the project will be
                    created as a draft and you can attach an asset once uploads ship.
                  </p>
                )}
              </div>

              {sourceType === ProjectSourceType.URL && (
                <div className="hidden sm:block">
                  <PhonePreview url={sourceUrl ?? ''} />
                </div>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button type="submit" disabled={createProject.isPending}>
                {createProject.isPending && <Loader2 className="animate-spin" />}
                Create project
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
