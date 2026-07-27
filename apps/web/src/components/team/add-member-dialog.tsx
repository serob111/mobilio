'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

import { OrgRole } from '@ag2/contracts';
import { ApiError } from '@/lib/api-client';
import { useAddMembership } from '@/lib/queries/memberships';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';

const addMemberSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role: z.nativeEnum(OrgRole),
});

type AddMemberValues = z.infer<typeof addMemberSchema>;

const ROLE_LABELS: Record<OrgRole, string> = {
  [OrgRole.OWNER]: 'Owner',
  [OrgRole.ADMIN]: 'Admin',
  [OrgRole.DEVELOPER]: 'Developer',
  [OrgRole.BILLING]: 'Billing',
  [OrgRole.VIEWER]: 'Viewer',
};

export function AddMemberDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = React.useState(false);
  const addMembership = useAddMembership(organizationId);

  const form = useForm<AddMemberValues>({
    resolver: zodResolver(addMemberSchema),
    defaultValues: { email: '', role: OrgRole.DEVELOPER },
  });

  async function onSubmit(values: AddMemberValues) {
    try {
      await addMembership.mutateAsync(values);
      toast.success('Member added');
      form.reset();
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        form.setError('email', {
          message: 'No ag2 account found for this email — they need to register first',
        });
      } else if (error instanceof ApiError && error.status === 409) {
        form.setError('email', { message: 'Already a member of this organization' });
      } else {
        toast.error(error instanceof Error ? error.message : 'Failed to add member');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus />
          Add member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a member</DialogTitle>
          <DialogDescription>
            They must already have an ag2 account with this email address.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="teammate@company.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.values(OrgRole).map((role) => (
                        <SelectItem key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="submit" disabled={addMembership.isPending}>
                {addMembership.isPending && <Loader2 className="animate-spin" />}
                Add member
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export { ROLE_LABELS };
