'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Check, Copy, Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { ApiKeyScope } from '@ag2/contracts';
import { useCreateApiKey } from '@/lib/queries/api-keys';
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  [ApiKeyScope.PROJECTS_READ]: 'Read projects',
  [ApiKeyScope.PROJECTS_WRITE]: 'Write projects',
  [ApiKeyScope.BUILDS_READ]: 'Read builds',
  [ApiKeyScope.BUILDS_TRIGGER]: 'Trigger builds',
};

const createApiKeySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  scopes: z.array(z.nativeEnum(ApiKeyScope)).min(1, 'Select at least one scope'),
});

type CreateApiKeyValues = z.infer<typeof createApiKeySchema>;

export function CreateApiKeyDialog({ organizationId }: { organizationId: string }) {
  const [open, setOpen] = React.useState(false);
  const [revealedKey, setRevealedKey] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const createApiKey = useCreateApiKey(organizationId);

  const form = useForm<CreateApiKeyValues>({
    resolver: zodResolver(createApiKeySchema),
    defaultValues: { name: '', scopes: [] },
  });

  async function onSubmit(values: CreateApiKeyValues) {
    try {
      const result = await createApiKey.mutateAsync(values);
      setRevealedKey(result.plainTextKey);
      form.reset();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API key');
    }
  }

  function handleClose(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setRevealedKey(null);
      setCopied(false);
    }
  }

  async function handleCopy() {
    if (!revealedKey) return;
    await navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    toast.success('Copied to clipboard');
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          New API key
        </Button>
      </DialogTrigger>
      <DialogContent>
        {revealedKey ? (
          <>
            <DialogHeader>
              <DialogTitle>API key created</DialogTitle>
              <DialogDescription>
                Copy this now — for your security, you won&apos;t be able to see it again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={revealedKey} className="font-mono text-sm" />
              <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Create API key</DialogTitle>
              <DialogDescription>
                Scope this key to only what it needs.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="CI pipeline" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scopes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Scopes</FormLabel>
                      <div className="space-y-2">
                        {Object.values(ApiKeyScope).map((scope) => {
                          const checked = field.value.includes(scope);
                          return (
                            <div key={scope} className="flex items-center gap-2">
                              <Checkbox
                                id={`scope-${scope}`}
                                checked={checked}
                                onCheckedChange={(next) => {
                                  field.onChange(
                                    next
                                      ? [...field.value, scope]
                                      : field.value.filter((s) => s !== scope),
                                  );
                                }}
                              />
                              <Label htmlFor={`scope-${scope}`} className="font-normal">
                                {SCOPE_LABELS[scope]}
                              </Label>
                            </div>
                          );
                        })}
                      </div>
                      <FormDescription>Reserved for the API/CLI integrations coming in a later milestone.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={createApiKey.isPending}>
                    {createApiKey.isPending && <Loader2 className="animate-spin" />}
                    Create key
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
