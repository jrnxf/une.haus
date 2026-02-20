import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { type z } from "zod";

import { Button } from "~/components/ui/button";
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
import { Textarea } from "~/components/ui/textarea";
import { tricks } from "~/lib/tricks";
import { createElementSchema } from "~/lib/tricks/schemas";
import { generateSlug } from "~/lib/utils";

import { PageHeader } from "~/components/page-header";

export const Route = createFileRoute(
  "/_authed/admin/tricks/elements/$elementId/edit",
)({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.elements.list.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { elementId } = Route.useParams();
  const numericElementId = Number(elementId);

  const { data: elements } = useSuspenseQuery(
    tricks.elements.list.queryOptions(),
  );

  const element = elements.find((e) => e.id === numericElementId);

  const updateElement = useMutation({
    mutationFn: tricks.elements.update.fn,
    onSuccess: () => {
      toast.success("Element updated");
      qc.removeQueries({
        queryKey: tricks.elements.list.queryOptions().queryKey,
      });
      router.navigate({ to: "/admin/tricks/elements" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rhf = useForm<z.infer<typeof createElementSchema>>({
    defaultValues: {
      slug: element?.slug ?? "",
      name: element?.name ?? "",
      description: element?.description ?? "",
      sortOrder: element?.sortOrder ?? 0,
    },
    resolver: zodResolver(createElementSchema),
  });

  const { control, handleSubmit, setValue } = rhf;

  if (!element) {
    return (
      <div className="p-6">
        <p>Element not found</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader maxWidth="max-w-5xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb to="/admin/tricks/elements">elements</PageHeader.Crumb>
          <PageHeader.Crumb>{element.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <Form
          rhf={rhf}
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit((data) =>
              updateElement.mutate({ data: { ...data, id: numericElementId } }),
            )(event);
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

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link to="/admin/tricks/elements">Cancel</Link>
            </Button>
            <FormSubmitButton busy={updateElement.isPending}>
              Save
            </FormSubmitButton>
          </div>
        </Form>
      </div>
    </>
  );
}
