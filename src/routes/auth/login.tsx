import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Loader2Icon } from "lucide-react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import { FormMessage } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { useTRPC } from "~/integrations/trpc/react";
import { loginSchema } from "~/models/auth";

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

export const Route = createFileRoute("/auth/login")({
  component: RouteComponent,
  validateSearch: searchParamsSchema,
});

function RouteComponent() {
  const search = useSearch({ from: "/auth/login" });
  const form = useForm<z.infer<typeof loginSchema>>({
    defaultValues: {
      email: "",
      redirect: search.redirect,
    },
    resolver: zodResolver(loginSchema),
  });

  const trpc = useTRPC();

  const {
    formState: { errors },
    handleSubmit,
    register,
  } = form;

  const navigate = useNavigate();

  const { mutate, isPending } = useMutation(
    trpc.email.sendMagicLink.mutationOptions({
      onSuccess: async () => {
        toast.success(`Email sent! Check your inbox for a magic link.`);
        navigate({ to: "/" });
      },
    }),
  );

  return (
    <div className="mx-auto w-full max-w-xl p-8" id="main-content">
      <FormProvider {...form}>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit((data) => {
              mutate(data);
            })(event);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input {...register("email")} autoFocus id="email" />
            <FormMessage error={errors.email} />
          </div>
          <div className="flex flex-row-reverse items-center justify-between">
            <Button
              disabled={isPending}
              iconLeft={
                isPending && <Loader2Icon className="size-4 animate-spin" />
              }
              type="submit"
            >
              <span>
                {isPending ? "Sending magic link" : "Send magic link"}
              </span>
            </Button>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
