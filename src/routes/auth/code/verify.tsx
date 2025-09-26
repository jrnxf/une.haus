import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
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

export const Route = createFileRoute("/auth/code/verify")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const search = useSearch({ from: "/auth/code/verify" });

  const navigate = useNavigate();

  const enterCodeForm = useForm<z.infer<typeof auth.enterCode.schema>>({
    defaultValues: {
      code: "",
    },
    resolver: zodResolver(auth.enterCode.schema),
  });

  const enterCodeMutation = useMutation({
    mutationFn: auth.enterCode.fn,
    onSuccess: async (data) => {
      if (data.status === "success") {
        toast.success("Welcome back to une.haus!");
        navigate({ to: search.redirect ?? "/auth/me" });
      } else if (data.status === "user_not_found") {
        navigate({ to: "/auth/register" });
      }
    },
    onError: (error) => {
      enterCodeForm.setError("code", { message: "Invalid code" });
      enterCodeForm.setFocus("code");
      toast.error(error.message);
      enterCodeForm.reset();
    },
  });

  return (
    <Form {...enterCodeForm}>
      <form
        className="mx-auto w-full max-w-xl space-y-4 p-8"
        id="main-content"
        onSubmit={(event) => {
          event.preventDefault();
          enterCodeForm.handleSubmit((data) => {
            enterCodeMutation.mutate({ data });
          })(event);
        }}
      >
        <FormField
          control={enterCodeForm.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Code</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={4}
                  {...field}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);

                    if (value.length === 4) {
                      enterCodeForm.handleSubmit((data) => {
                        enterCodeMutation.mutate({ data });
                      })();
                    }
                  }}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  autoComplete="off"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} autoFocus />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>

      <Button variant="link" type="button" asChild>
        <Link to="/auth/code/send">Need a code?</Link>
      </Button>
    </Form>
  );
}
