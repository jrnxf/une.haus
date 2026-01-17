import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { StringListInput } from "~/components/input/string-list-input";
import { YoutubeInput } from "~/components/input/youtube-input";
import { Button } from "~/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormSubmitButton,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { TrickSuggestionDiff } from "~/db/schema";
import { tricks } from "~/lib/tricks";

export const Route = createFileRoute("/_authed/tricks/$trickId/suggest")({
  loader: async ({ context, params }) => {
    // trickId is actually the slug in this route
    await context.queryClient.ensureQueryData(
      tricks.get.queryOptions({ slug: params.trickId }),
    );
  },
  component: RouteComponent,
});

const suggestionFormSchema = z.object({
  name: z.string().min(1),
  alternateNames: z.array(z.string()),
  definition: z.string().nullable(),
  inventedBy: z.string().nullable(),
  yearLanded: z.number().nullable(),
  videoUrl: z.string().nullable(),
  videoTimestamp: z.string().nullable(),
  notes: z.string().nullable(),
  reason: z.string().optional(),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { trickId: slug } = Route.useParams();

  const { data: trick } = useSuspenseQuery(
    tricks.get.queryOptions({ slug }),
  );

  const createSuggestion = useMutation({
    mutationFn: tricks.suggestions.create.fn,
    onSuccess: () => {
      toast.success("Suggestion submitted for review");
      // Remove query so loader fetches fresh data on navigation
      qc.removeQueries({
        queryKey: tricks.suggestions.list.queryOptions({ status: "pending" }).queryKey,
      });
      router.navigate({ to: "/tricks/review", search: { tab: "suggestions" } });
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

  const rhf = useForm<SuggestionFormValues>({
    defaultValues: {
      name: trick.name,
      alternateNames: trick.alternateNames ?? [],
      definition: trick.definition ?? "",
      inventedBy: trick.inventedBy ?? "",
      yearLanded: trick.yearLanded,
      videoUrl: trick.videoUrl ?? "",
      videoTimestamp: trick.videoTimestamp ?? "",
      notes: trick.notes ?? "",
      reason: "",
    },
    resolver: zodResolver(suggestionFormSchema),
  });

  const { control, handleSubmit } = rhf;

  const handleFormSubmit = (data: SuggestionFormValues) => {
    // Build diff by comparing to original trick
    const diff: TrickSuggestionDiff = {};

    if (data.name !== trick.name) {
      diff.name = { old: trick.name, new: data.name };
    }

    const oldAltNames = trick.alternateNames ?? [];
    if (JSON.stringify(data.alternateNames) !== JSON.stringify(oldAltNames)) {
      diff.alternateNames = { old: oldAltNames, new: data.alternateNames };
    }

    if (data.definition !== (trick.definition ?? null)) {
      diff.definition = {
        old: trick.definition ?? null,
        new: data.definition ?? null,
      };
    }

    if (data.inventedBy !== (trick.inventedBy ?? null)) {
      diff.inventedBy = {
        old: trick.inventedBy ?? null,
        new: data.inventedBy ?? null,
      };
    }

    if (data.yearLanded !== (trick.yearLanded ?? null)) {
      diff.yearLanded = {
        old: trick.yearLanded ?? null,
        new: data.yearLanded ?? null,
      };
    }

    if (data.videoUrl !== (trick.videoUrl ?? null)) {
      diff.videoUrl = {
        old: trick.videoUrl ?? null,
        new: data.videoUrl ?? null,
      };
    }

    if (data.videoTimestamp !== (trick.videoTimestamp ?? null)) {
      diff.videoTimestamp = {
        old: trick.videoTimestamp ?? null,
        new: data.videoTimestamp ?? null,
      };
    }

    if (data.notes !== (trick.notes ?? null)) {
      diff.notes = { old: trick.notes ?? null, new: data.notes ?? null };
    }

    // If no changes, don't submit
    if (Object.keys(diff).length === 0) {
      toast.error("No changes detected");
      return;
    }

    createSuggestion.mutate({
      data: {
        trickId: trick.id,
        diff,
        reason: data.reason || null,
      },
    });
  };

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/tricks">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Suggest Edit: {trick.name}</h1>
          <p className="text-muted-foreground text-sm">
            Your suggestion will be reviewed by the community
          </p>
        </div>
      </div>

      <Form
        rhf={rhf}
        className="flex flex-col gap-6"
        onSubmit={(event) => {
          event.preventDefault();
          handleSubmit(handleFormSubmit)(event);
        }}
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Info</h3>

          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="alternateNames"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Alternate Names</FormLabel>
                <FormControl>
                  <StringListInput
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Add alias..."
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="definition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Definition</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    value={field.value ?? ""}
                    rows={3}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* History */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">History</h3>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <FormField
              control={control}
              name="inventedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Invented By</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={control}
              name="yearLanded"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year Landed</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value?.toString() ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Video */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Video</h3>

          <FormField
            control={control}
            name="videoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video URL</FormLabel>
                <FormControl>
                  <YoutubeInput
                    currentId={
                      field.value
                        ? new URL(field.value).searchParams.get("v")
                        : null
                    }
                    onChange={(videoId) => {
                      field.onChange(
                        videoId
                          ? `https://www.youtube.com/watch?v=${videoId}`
                          : null,
                      );
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="videoTimestamp"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Video Timestamp</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value ?? ""} placeholder="e.g., 1:30" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Notes */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Notes</h3>

          <FormField
            control={control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea {...field} value={field.value ?? ""} rows={3} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Reason */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Reason for Changes</h3>

          <FormField
            control={control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Explain why these changes should be made..."
                    rows={2}
                  />
                </FormControl>
                <FormDescription>
                  Help reviewers understand your suggestion
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              router.navigate({ to: "/tricks" })
            }
          >
            Cancel
          </Button>
          <FormSubmitButton busy={createSuggestion.isPending}>
            Submit Suggestion
          </FormSubmitButton>
        </div>
      </Form>
    </div>
  );
}
