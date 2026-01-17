import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { toast } from "sonner";

import { TrickForm } from "~/components/forms/trick";
import { Button } from "~/components/ui/button";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/admin/tricks/create")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.categories.list.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();

  const createTrick = useMutation({
    mutationFn: tricks.create.fn,
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["tricks"] });
      toast.success("Trick created");
      router.navigate({ to: "/tricks" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tricks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Create Trick</h1>
      </div>

      <TrickForm
        onSubmit={(data) => createTrick.mutate({ data })}
        onCancel={() => router.navigate({ to: "/tricks" })}
        submitLabel="Create Trick"
        isPending={createTrick.isPending}
      />
    </div>
  );
}
