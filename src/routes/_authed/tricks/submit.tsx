import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import { BackLink } from "~/components/back-link";
import { TrickForm } from "~/components/forms/trick";
import { tricks } from "~/lib/tricks";
import { createSubmissionSchema } from "~/lib/tricks/submissions/schemas";

export const Route = createFileRoute("/_authed/tricks/submit")({
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

  const createSubmission = useMutation({
    mutationFn: tricks.submissions.create.fn,
    onSuccess: async () => {
      toast.success("Trick submitted for review");
      // Remove stale cache and prefetch fresh data before navigating
      // This ensures the route loader finds data in cache immediately
      qc.removeQueries({
        queryKey: tricks.submissions.list.queryOptions({ status: "pending" }).queryKey,
      });
      await Promise.all([
        qc.prefetchQuery(tricks.submissions.list.queryOptions({ status: "pending" })),
        qc.prefetchQuery(tricks.suggestions.list.queryOptions({ status: "pending" })),
      ]);
      router.navigate({ to: "/tricks/review" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="space-y-4">
        <BackLink to="/tricks" label="graph" />
        <div>
          <h1 className="text-2xl font-bold">submit trick</h1>
          <p className="text-muted-foreground text-sm">
            your submission will be reviewed by the community
          </p>
        </div>
      </div>

      <TrickForm
        onSubmit={(data) => {
          // Validate against submission schema and submit
          const parsed = createSubmissionSchema.safeParse(data);
          if (parsed.success) {
            createSubmission.mutate({ data: parsed.data });
          } else {
            console.error("[submit] Validation failed:", parsed.error.flatten());
            const fieldErrors = parsed.error.flatten().fieldErrors;
            const errorMessages = Object.entries(fieldErrors)
              .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
              .join("; ");
            toast.error(errorMessages || "Invalid submission data");
          }
        }}
        onCancel={() => router.navigate({ to: "/tricks" })}
        submitLabel="Submit for Review"
        isPending={createSubmission.isPending}
      />
    </div>
  );
}
