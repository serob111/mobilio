'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ApiError } from '@/lib/api-client';
import { useCreateTeam } from '@/lib/queries/teams';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

type CreateTeamValues = z.infer<typeof createTeamSchema>;

export function CreateTeamDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = React.useState(false);
  const createTeam = useCreateTeam(organizationId);

  const form = useForm<CreateTeamValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: '' },
  });

  async function onSubmit(values: CreateTeamValues) {
    try {
      await createTeam.mutateAsync(values);
      toast.success('Team created');
      form.reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        form.setError('name', { message: 'A team with this name already exists' });
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to create team');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create team</DialogTitle>
          <DialogDescription>
            Teams group members within your organization for future scoped access.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team name</FormLabel>
                  <FormControl>
                    <Input placeholder="Mobile Platform" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={createTeam.isPending}>
                {createTeam.isPending && <Loader2 className="animate-spin" />}
                Create team
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
