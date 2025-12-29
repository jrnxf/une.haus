import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Form } from "~/components/ui/form";
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

  const inputOTPRef = useRef<HTMLInputElement>(null);
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
    onError: () => {
      enterCodeForm.setError("code", { message: "Invalid code" });
      enterCodeForm.setValue("code", "");
      inputOTPRef.current?.focus();
    },
  });

  return (
    <div className="grid h-full place-items-center p-6">
      <Form
        rhf={enterCodeForm}
        className="bg-card mx-auto w-full max-w-xl rounded-xl border p-6"
        id="main-content"
        onSubmit={(event) => {
          event.preventDefault();
          enterCodeForm.handleSubmit(async (data) => {
            await enterCodeMutation.mutateAsync({ data });
          })(event);
        }}
      >
        <FieldGroup>
          <Controller
            name="code"
            control={enterCodeForm.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel>Enter verification code</FieldLabel>
                <FieldDescription>
                  We sent a 4-digit code to your email.
                </FieldDescription>
                <InputOTP
                  maxLength={4}
                  {...field}
                  pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  autoComplete="off"
                  autoFocus
                  ref={inputOTPRef}
                >
                  <InputOTPGroup className="gap-2.5 *:data-[slot=input-otp-slot]:rounded-md *:data-[slot=input-otp-slot]:border">
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldError errors={[fieldState.error]} />
              </Field>
            )}
          />

          <FieldGroup>
            <Button type="submit">Verify</Button>
            <FieldDescription className="text-center">
              Didn&apos;t receive the code?{" "}
              <Link to="/auth/code/send">Resend</Link>
            </FieldDescription>
          </FieldGroup>
        </FieldGroup>
      </Form>
    </div>
  );
}
