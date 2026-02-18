import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import { TrickForm } from "~/components/forms/trick";
import { session } from "~/lib/session";
import { tricks } from "~/lib/tricks";
import type { CreateTrickArgs } from "~/lib/tricks/schemas";
import { createSubmissionSchema } from "~/lib/tricks/submissions/schemas";

export const Route = createFileRoute("/_authed/tricks/create")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(
      tricks.elements.list.queryOptions(),
    );
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [{ label: "tricks", to: "/tricks" }, { label: "create" }],
      maxWidth: "2xl",
    },
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: sessionData } = useSuspenseQuery(session.get.queryOptions());
  const isAdmin = sessionData.user?.id === 1;

  const createSubmission = useMutation({
    mutationFn: tricks.submissions.create.fn,
    onSuccess: () => {
      toast.success("Trick submitted for review");
      qc.removeQueries({
        queryKey: tricks.submissions.list.queryOptions({ status: "pending" })
          .queryKey,
      });
      router.navigate({ to: "/tricks/review" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const createTrickDirectly = useMutation({
    mutationFn: tricks.create.fn,
    onSuccess: () => {
      toast.success("Trick created");
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey });
      router.navigate({ to: "/tricks" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (data: CreateTrickArgs) => {
    const parsed = createSubmissionSchema.safeParse(data);
    if (parsed.success) {
      createSubmission.mutate({ data: parsed.data });
    } else {
      console.error("[create] Validation failed:", parsed.error.flatten());
      const fieldErrors = parsed.error.flatten().fieldErrors;
      const errorMessages = Object.entries(fieldErrors)
        .map(([field, errors]) => `${field}: ${errors?.join(", ")}`)
        .join("; ");
      toast.error(errorMessages || "Invalid submission data");
    }
  };

  const handleAdminSubmit = (data: CreateTrickArgs) => {
    createTrickDirectly.mutate({ data });
  };

  const isPending = createSubmission.isPending || createTrickDirectly.isPending;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <TrickForm
        onSubmit={handleSubmit}
        onAdminSubmit={isAdmin ? handleAdminSubmit : undefined}
        onCancel={() => router.navigate({ to: "/tricks" })}
        submitLabel="Submit"
        isPending={isPending}
      />
    </div>
  );
}
