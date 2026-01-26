import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
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
import { createModifierSchema } from "~/lib/tricks/schemas";
import { generateSlug } from "~/lib/utils";

export const Route = createFileRoute("/_authed/admin/tricks/modifiers/create")({
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();

  const createModifier = useMutation({
    mutationFn: tricks.modifiers.create.fn,
    onSuccess: () => {
      toast.success("Modifier created");
      qc.removeQueries({
        queryKey: tricks.modifiers.list.queryOptions().queryKey,
      });
      router.navigate({ to: "/admin/tricks/modifiers" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rhf = useForm<z.infer<typeof createModifierSchema>>({
    defaultValues: {
      slug: "",
      name: "",
      description: "",
      sortOrder: 0,
    },
    resolver: zodResolver(createModifierSchema),
  });

  const { control, handleSubmit, setValue } = rhf;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/admin/tricks/modifiers">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">create modifier</h1>
      </div>

      <Form
        rhf={rhf}
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit((data) => createModifier.mutate({ data }))(event);
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
            <Link to="/admin/tricks/modifiers">Cancel</Link>
          </Button>
          <FormSubmitButton busy={createModifier.isPending}>
            Save
          </FormSubmitButton>
        </div>
      </Form>
    </div>
  );
}
