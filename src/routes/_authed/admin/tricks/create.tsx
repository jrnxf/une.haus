import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import { BackLink } from "~/components/back-link";
import { TrickForm } from "~/components/forms/trick";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/admin/tricks/create")({
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

  const createTrick = useMutation({
    mutationFn: tricks.create.fn,
    onSuccess: async () => {
      toast.success("Trick created");
      // Remove stale cache and prefetch fresh data before navigating
      // This ensures the route loader finds data in cache immediately
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey });
      await qc.prefetchQuery(tricks.graph.queryOptions());
      router.navigate({ to: "/tricks" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-4">
        <BackLink to="/tricks" label="graph" />
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
