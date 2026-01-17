import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

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
import { createCategorySchema } from "~/lib/tricks/schemas";

export const Route = createFileRoute("/_authed/admin/tricks/categories")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.categories.list.queryOptions(),
    );
  },
  component: RouteComponent,
});

type Category = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

function RouteComponent() {
  const qc = useQueryClient();
  const { data: categories } = useSuspenseQuery(
    tricks.categories.list.queryOptions(),
  );

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(
    null,
  );
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const createCategory = useMutation({
    mutationFn: tricks.categories.create.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.categories"] });
      toast.success("Category created");
      setIsCreateOpen(false);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateCategory = useMutation({
    mutationFn: tricks.categories.update.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.categories"] });
      toast.success("Category updated");
      setEditingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteCategory = useMutation({
    mutationFn: tricks.categories.delete.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks.categories"] });
      toast.success("Category deleted");
      setDeletingCategory(null);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/tricks">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Trick Categories</h1>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 size-4" />
          Add Category
        </Button>
      </div>

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
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-muted-foreground">
                {category.slug}
              </TableCell>
              <TableCell className="text-muted-foreground max-w-xs truncate">
                {category.description}
              </TableCell>
              <TableCell>{category.sortOrder}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEditingCategory(category)}
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingCategory(category)}
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
            <DialogTitle>Create Category</DialogTitle>
          </DialogHeader>
          <CategoryForm
            onSubmit={(data) => createCategory.mutate({ data })}
            isPending={createCategory.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingCategory}
        onOpenChange={(open) => !open && setEditingCategory(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <CategoryForm
              defaultValues={editingCategory}
              onSubmit={(data) =>
                updateCategory.mutate({
                  data: { ...data, id: editingCategory.id },
                })
              }
              isPending={updateCategory.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={(open) => !open && setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deletingCategory?.name}
              &quot;? This will remove the category from all tricks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deletingCategory &&
                deleteCategory.mutate({ data: deletingCategory.id })
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CategoryForm({
  defaultValues,
  onSubmit,
  isPending,
}: {
  defaultValues?: Partial<z.infer<typeof createCategorySchema>>;
  onSubmit: (data: z.infer<typeof createCategorySchema>) => void;
  isPending: boolean;
}) {
  const rhf = useForm<z.infer<typeof createCategorySchema>>({
    defaultValues: {
      slug: defaultValues?.slug ?? "",
      name: defaultValues?.name ?? "",
      description: defaultValues?.description ?? "",
      sortOrder: defaultValues?.sortOrder ?? 0,
    },
    resolver: zodResolver(createCategorySchema),
  });

  const { control, handleSubmit, setValue, watch } = rhf;
  const name = watch("name");

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

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
                  const currentSlug = rhf.getValues("slug");
                  const previousAutoSlug = generateSlug(name);
                  if (!currentSlug || currentSlug === previousAutoSlug) {
                    setValue("slug", generateSlug(e.target.value));
                  }
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
              <Input {...field} />
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
