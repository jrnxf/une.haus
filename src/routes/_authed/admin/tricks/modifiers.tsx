import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

import { PageHeader } from "~/components/page-header";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Textarea } from "~/components/ui/textarea";
import { tricks } from "~/lib/tricks";
import { createModifierSchema } from "~/lib/tricks/schemas";
import { generateSlug } from "~/lib/utils";

export const Route = createFileRoute("/_authed/admin/tricks/modifiers")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.modifiers.list.queryOptions(),
    );
  },
  component: RouteComponent,
});

type Modifier = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

function RouteComponent() {
  const qc = useQueryClient();
  const { data: modifiers } = useSuspenseQuery(
    tricks.modifiers.list.queryOptions(),
  );

  const [editingModifier, setEditingModifier] = useState<Modifier | null>(null);
  const [deletingModifier, setDeletingModifier] = useState<Modifier | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createModifier = useMutation({
    mutationFn: tricks.modifiers.create.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.modifiers"] });
      toast.success("Modifier created");
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateModifier = useMutation({
    mutationFn: tricks.modifiers.update.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.modifiers"] });
      toast.success("Modifier updated");
      setEditingModifier(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteModifier = useMutation({
    mutationFn: tricks.modifiers.delete.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.modifiers"] });
      toast.success("Modifier deleted");
      setDeletingModifier(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <>
      <PageHeader>
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>modifiers</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Actions>
          <Button onClick={() => setIsCreateOpen(true)}>Create</Button>
        </PageHeader.Actions>
      </PageHeader>
      <div className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-6">
        <p className="text-muted-foreground text-sm">
          Modifiers are global prefixes/suffixes that can apply to any trick
          (e.g., switch, fakie, late, regular).
        </p>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="w-20">Order</TableHead>
            <TableHead className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {modifiers.map((modifier) => (
            <TableRow key={modifier.id}>
              <TableCell className="font-medium">{modifier.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {modifier.slug}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">
                {modifier.description}
              </TableCell>
              <TableCell>{modifier.sortOrder}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Edit"
                    onClick={() => setEditingModifier(modifier)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete"
                    onClick={() => setDeletingModifier(modifier)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Modifier</DialogTitle>
          </DialogHeader>
          <ModifierForm
            onSubmit={(data) => createModifier.mutate({ data })}
            isPending={createModifier.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingModifier}
        onOpenChange={(open) => !open && setEditingModifier(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Modifier</DialogTitle>
          </DialogHeader>
          {editingModifier && (
            <ModifierForm
              defaultValues={editingModifier}
              onSubmit={(data) =>
                updateModifier.mutate({
                  data: { ...data, id: editingModifier.id },
                })
              }
              isPending={updateModifier.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingModifier}
        onOpenChange={(open) => !open && setDeletingModifier(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Modifier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingModifier?.name}
              &quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingModifier &&
                deleteModifier.mutate({ data: deletingModifier.id })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </>
  );
}

function ModifierForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<z.infer<typeof createModifierSchema>>;
  onSubmit: (data: z.infer<typeof createModifierSchema>) => void;
  isPending: boolean;
}) {
  const rhf = useForm<z.infer<typeof createModifierSchema>>({
    defaultValues: {
      slug: defaultValues?.slug ?? "",
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      sortOrder: defaultValues?.sortOrder ?? 0,
    },
    resolver: zodResolver(createModifierSchema),
  });

  const { control, handleSubmit, setValue } = rhf;

  return (
    <Form
      rhf={rhf}
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        handleSubmit(onSubmit)(event);
      }}
    >
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Name</FormLabel>
            <FormControl>
              <Input
                {...field}
                onChange={(e) => {
                  field.onChange(e);
                  setValue("slug", generateSlug(e.target.value));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Slug</FormLabel>
            <FormControl>
              <Input {...field} disabled />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} rows={2} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="sortOrder"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Sort Order</FormLabel>
            <FormControl>
              <Input
                type="number"
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                value={field.value.toString()}
                onChange={(e) => field.onChange(Number(e.target.value))}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex justify-end">
        <FormSubmitButton busy={isPending}>Save</FormSubmitButton>
      </div>
    </Form>
  );
}
