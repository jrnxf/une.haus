import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
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
import { auth } from "~/lib/auth";

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

export const Route = createFileRoute("/auth/code/send")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/auth/code/send" });

  const sendCodeMutation = useMutation({
    mutationFn: auth.sendCode.fn,
    onSuccess: async () => {
      navigate({ to: "/auth/code/verify", search: { redirect: search.redirect } });
    },
  });

  const sendCodeForm = useForm<z.infer<typeof auth.sendCode.schema>>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(auth.sendCode.schema),
  });

  return (
    <Form
      rhf={sendCodeForm}
      className="mx-auto w-full max-w-xl space-y-4 p-8"
      id="main-content"
      onSubmit={(event) => {
        event.preventDefault();
        sendCodeForm.handleSubmit((data) => {
          sendCodeMutation.mutate({ data });
        })(event);
      }}
    >
      <FormField
        control={sendCodeForm.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email</FormLabel>
            <FormDescription>
              You'll receive an email with a code to authenticate
            </FormDescription>
            <FormControl>
              <Input {...field} autoFocus />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="flex flex-row-reverse items-center justify-between">
        <Button
          disabled={sendCodeMutation.isPending}
          iconLeft={
            sendCodeMutation.isPending && (
              <Loader2Icon className="size-4 animate-spin" />
            )
          }
          type="submit"
        >
          <span>
            {sendCodeMutation.isPending ? "Sending code" : "Send code"}
          </span>
        </Button>

        <Button variant="link" type="button" asChild>
          <Link to="/auth/code/verify">Have a code?</Link>
        </Button>
      </div>
    </Form>
  );
}
