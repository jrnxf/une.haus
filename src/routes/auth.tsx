import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { email } from "~/lib/email";

const searchParamsSchema = z
  .object({
    flash: z.string().optional(),
    redirect: z.string().optional().default("/auth/me"),
  })
  .optional()
  .default({
    flash: undefined,
    redirect: "/auth/me",
  });

export const Route = createFileRoute("/auth")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const search = useSearch({ from: "/auth" });

  const navigate = useNavigate();

  const { mutate, isPending } = useMutation({
    mutationFn: email.sendMagicLink.fn,
    onSuccess: async () => {
      toast.success(`Email sent! Check your inbox for a magic link.`);
      navigate({ to: "/" });
    },
  });

  const form = useForm<z.infer<typeof email.sendMagicLink.schema>>({
    defaultValues: {
      email: "",
      redirect: search.redirect,
    },
    resolver: zodResolver(email.sendMagicLink.schema),
  });

  const { handleSubmit, control } = form;

  return (
    <Form {...form}>
      <form
        className="mx-auto w-full max-w-xl space-y-4 p-8"
        id="main-content"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit((data) => {
            mutate({ data });
          })(event);
        }}
      >
        <FormField
          control={control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormDescription>
                You'll receive an email with a magic link to authenticate
              </FormDescription>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-row-reverse items-center justify-between">
          <Button
            disabled={isPending}
            iconLeft={
              isPending && <Loader2Icon className="size-4 animate-spin" />
            }
            type="submit"
          >
            <span>{isPending ? "Sending magic link" : "Send magic link"}</span>
          </Button>
        </div>
      </form>
    </Form>
  );
}
