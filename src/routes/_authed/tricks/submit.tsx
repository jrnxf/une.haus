import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { toast } from "sonner";

import { TrickForm } from "~/components/forms/trick";
import { Button } from "~/components/ui/button";
import { tricks } from "~/lib/tricks";
import { createSubmissionSchema } from "~/lib/tricks/submissions/schemas";

export const Route = createFileRoute("/_authed/tricks/submit")({
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

  const createSubmission = useMutation({
    mutationFn: tricks.submissions.create.fn,
    onSuccess: () => {
      toast.success("Trick submitted for review");
      // Remove query so loader fetches fresh data on navigation
      qc.removeQueries({
        queryKey: tricks.submissions.list.queryOptions({ status: "pending" }).queryKey,
      });
      router.navigate({ to: "/tricks/review" });
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
        <div>
          <h1 className="text-2xl font-bold">Submit a New Trick</h1>
          <p className="text-muted-foreground text-sm">
            Your submission will be reviewed by the community
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
