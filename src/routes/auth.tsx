import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
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
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "~/components/ui/input-otp";
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
  const [step, setStep] = useState<"send" | "enter">("send");

  return (
    <>
      {step === "send" ? (
        <SendCodeForm goToCodeEntryForm={() => setStep("enter")} />
      ) : (
        <EnterCodeForm />
      )}
    </>
  );
}

function EnterCodeForm() {
  const search = useSearch({ from: "/auth" });

  const navigate = useNavigate();

  const enterCodeForm = useForm<z.infer<typeof email.enterCode.schema>>({
    defaultValues: {
      code: "",
    },
    resolver: zodResolver(email.enterCode.schema),
  });

  const enterCodeMutation = useMutation({
    mutationFn: email.enterCode.fn,
    onSuccess: async () => {
      toast.success("Welcome to une.haus!");
      navigate({ to: search.redirect ?? "/auth/me" });
    },
    onError: () => {
      enterCodeForm.setError("code", { message: "Invalid code" });
      enterCodeForm.setFocus("code");
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
    </Form>
  );
}

function SendCodeForm({
  goToCodeEntryForm,
}: {
  goToCodeEntryForm: () => void;
}) {
  const sendCodeMutation = useMutation({
    mutationFn: email.sendCode.fn,
    onSuccess: async () => {
      toast.success(`Email sent! Check your inbox for a code.`);
      goToCodeEntryForm();
    },
  });

  const sendCodeForm = useForm<z.infer<typeof email.sendCode.schema>>({
    defaultValues: {
      email: "",
    },
    resolver: zodResolver(email.sendCode.schema),
  });

  return (
    <Form {...sendCodeForm}>
      <form
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
                <Input {...field} />
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

          <Button variant="link" type="button" onClick={goToCodeEntryForm}>
            Have a code?
          </Button>
        </div>
      </form>
    </Form>
  );
}
