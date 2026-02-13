import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";

import { toast } from "sonner";

import {
  TrickForm,
  type TrickFormDefaultValues,
} from "~/components/forms/trick";
import { PageHeader } from "~/components/page-header";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/admin/tricks/$trickId/edit")({
  loader: async ({ context, params }) => {
    const trickId = Number(params.trickId);
    await Promise.all([
      context.queryClient.ensureQueryData(
        tricks.getById.queryOptions({ id: trickId }),
      ),
      context.queryClient.ensureQueryData(tricks.elements.list.queryOptions()),
    ]);
  },
  component: RouteComponent,
});

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { trickId } = Route.useParams();
  const numericTrickId = Number(trickId);

  const { data: trick } = useSuspenseQuery(
    tricks.getById.queryOptions({ id: numericTrickId }),
  );

  const updateTrick = useMutation({
    mutationFn: tricks.update.fn,
    onSuccess: () => {
      toast.success("Trick updated");
      qc.removeQueries({ queryKey: tricks.graph.queryOptions().queryKey });
      qc.removeQueries({
        queryKey: tricks.getById.queryOptions({ id: numericTrickId }).queryKey,
      });
      qc.removeQueries({
        queryKey: tricks.videos.list.queryOptions({ trickId: numericTrickId })
          .queryKey,
      });
      router.navigate({ to: "/tricks" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  if (!trick) {
    return (
      <div className="p-6">
        <p>Trick not found</p>
      </div>
    );
  }

  // Transform trick data to form values
  const defaultValues: TrickFormDefaultValues = {
    slug: trick.slug,
    name: trick.name,
    alternateNames: trick.alternateNames ?? [],
    definition: trick.definition,
    inventedBy: trick.inventedBy,
    yearLanded: trick.yearLanded,
    muxAssetIds: trick.videos?.map((v) => v.muxAssetId) ?? [],
    notes: trick.notes,
    prerequisites: trick.outgoingRelationships
      .filter((r) => r.type === "prerequisite")
      .map((r) => ({
        targetTrickId: r.targetTrick.id,
        targetTrickSlug: r.targetTrick.slug,
        targetTrickName: r.targetTrick.name,
        type: "prerequisite" as const,
      })),
    relatedTricks: trick.outgoingRelationships
      .filter((r) => r.type === "related")
      .map((r) => ({
        targetTrickId: r.targetTrick.id,
        targetTrickSlug: r.targetTrick.slug,
        targetTrickName: r.targetTrick.name,
        type: "related" as const,
      })),
    elements: trick.elementAssignments.map((a) => ({
      id: a.element.id,
      slug: a.element.slug,
      name: a.element.name,
    })),
  };

  return (
    <>
      <PageHeader maxWidth="2xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb to="/tricks">tricks</PageHeader.Crumb>
          <PageHeader.Crumb>edit: {trick.name}</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4 md:p-6">
        <TrickForm
          defaultValues={defaultValues}
          onSubmit={(data) =>
            updateTrick.mutate({ data: { ...data, id: numericTrickId } })
          }
          onCancel={() => router.navigate({ to: "/tricks" })}
          submitLabel="Save Changes"
          isPending={updateTrick.isPending}
          excludeTrickId={numericTrickId}
        />
      </div>
    </>
  );
}
