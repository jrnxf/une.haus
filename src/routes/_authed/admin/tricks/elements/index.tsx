import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { toast } from "sonner";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/admin/tricks/elements/")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.elements.list.queryOptions(),
    );
  },
  component: RouteComponent,
});

type Element = {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  sortOrder: number;
  createdAt: Date;
};

function RouteComponent() {
  const qc = useQueryClient();
  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  );

  const [deletingElement, setDeletingElement] = useState<Element | null>(null);

  const listQueryKey = tricks.elements.list.queryOptions().queryKey;

  const deleteElement = useMutation({
    mutationFn: tricks.elements.delete.fn,
    onMutate: async ({ data: id }) => {
      await qc.cancelQueries({ queryKey: listQueryKey });
      const prev = qc.getQueryData(listQueryKey);
      qc.setQueryData(listQueryKey, (old: Element[] | undefined) =>
        old?.filter((element) => element.id !== id),
      );
      return { prev };
    },
    onSuccess: () => {
      toast.success("Element deleted");
      setDeletingElement(null);
    },
    onError: (error, _, context) => {
      if (context?.prev) {
        qc.setQueryData(listQueryKey, context.prev);
      }
      toast.error(error.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: listQueryKey });
    },
  });

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>elements</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
        <PageHeader.Right>
          <PageHeader.Actions>
            <Button asChild>
              <Link to="/admin/tricks/elements/create">Create</Link>
            </Button>
          </PageHeader.Actions>
        </PageHeader.Right>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <p className="text-muted-foreground text-sm">
          Elements are the components that make up a trick (e.g., spins, flips,
          twists).
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
            {elements.map((element) => (
              <TableRow key={element.id}>
                <TableCell className="font-medium">{element.name}</TableCell>
                <TableCell className="text-muted-foreground">
                  {element.slug}
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs truncate">
                  {element.description}
                </TableCell>
                <TableCell>{element.sortOrder}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      aria-label="Edit"
                    >
                      <Link
                        to="/admin/tricks/elements/$elementId/edit"
                        params={{ elementId: element.id.toString() }}
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete"
                      onClick={() => setDeletingElement(element)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Delete Confirmation */}
        <AlertDialog
          open={!!deletingElement}
          onOpenChange={(open) => !open && setDeletingElement(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Element</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deletingElement?.name}
                &quot;? This will remove the element from all tricks.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  deletingElement &&
                  deleteElement.mutate({ data: deletingElement.id })
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
