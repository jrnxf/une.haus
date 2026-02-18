import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { DisciplineSelector } from "~/components/input/discipline-selector";
import { RiderSelector } from "~/components/input/rider-selector";
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
import { USER_DISCIPLINES, type UtvVideoSuggestionDiff } from "~/db/schema";
import { invariant } from "~/lib/invariant";
import { utv } from "~/lib/utv/core";

const pathParametersSchema = z.object({
  videoId: z.coerce.number(),
});

export const Route = createFileRoute("/_authed/vault/$videoId/suggest")({
  params: {
    parse: pathParametersSchema.parse,
  },
  staticData: {
    pageHeader: {
      breadcrumbs: [
        { label: "vault", to: "/vault" },
        { label: "" },
        { label: "suggest" },
      ],
      maxWidth: "2xl",
    },
  },
  loader: async ({ context, params: { videoId } }) => {
    const video = await context.queryClient.ensureQueryData(
      utv.get.queryOptions(videoId),
    );
    return {
      pageHeader: {
        breadcrumbOverrides: {
          1: {
            label: video?.title || video?.legacyTitle || "video",
            to: `/vault/${videoId}`,
          },
        },
      },
    };
  },
  component: RouteComponent,
});

type RiderEntry = {
  orderId: string;
  userId: number | null;
  name: string | null;
};

// Generate a unique order ID
function generateOrderId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const suggestionFormSchema = z.object({
  title: z.string().min(1),
  disciplines: z.array(z.enum(USER_DISCIPLINES)).nullable(),
  riders: z.array(
    z.object({
      orderId: z.string(),
      userId: z.number().nullable(),
      name: z.string().nullable(),
    }),
  ),
  reason: z.string().optional(),
});

type SuggestionFormValues = z.infer<typeof suggestionFormSchema>;

function RouteComponent() {
  const router = useRouter();
  const qc = useQueryClient();
  const { videoId } = Route.useParams();

  const { data: video } = useSuspenseQuery(utv.get.queryOptions(videoId));

  invariant(video, "Video not found");

  const displayTitle = video.title || video.legacyTitle;

  const createSuggestion = useMutation({
    mutationFn: utv.suggestions.create.fn,
    onSuccess: () => {
      toast.success("Suggestion submitted for review");
      qc.removeQueries({
        queryKey: utv.suggestions.list.queryOptions({ status: "pending" })
          .queryKey,
      });
      router.navigate({ to: "/vault/review" });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Transform riders from video for the form
  // Include user name if available, so it shows in diffs
  const currentRiders: RiderEntry[] = video.riders.map((r) => ({
    orderId: generateOrderId(),
    userId: r.userId,
    name: r.user?.name ?? r.name,
  }));

  const rhf = useForm<SuggestionFormValues>({
    defaultValues: {
      title: video.title || video.legacyTitle,
      disciplines: video.disciplines ?? null,
      riders: currentRiders,
      reason: "",
    },
    resolver: zodResolver(suggestionFormSchema),
  });

  const { control, handleSubmit } = rhf;

  const handleFormSubmit = (data: SuggestionFormValues) => {
    const diff: UtvVideoSuggestionDiff = {};

    // Check title change
    if (data.title !== displayTitle) {
      diff.title = { old: displayTitle, new: data.title };
    }

    // Check disciplines change
    const oldDisciplines = video.disciplines ?? null;
    if (JSON.stringify(data.disciplines) !== JSON.stringify(oldDisciplines)) {
      diff.disciplines = { old: oldDisciplines, new: data.disciplines };
    }

    // Check riders change
    if (JSON.stringify(data.riders) !== JSON.stringify(currentRiders)) {
      diff.riders = { old: currentRiders, new: data.riders };
    }

    // If no changes, don't submit
    if (Object.keys(diff).length === 0) {
      toast.error("No changes detected");
      return;
    }

    createSuggestion.mutate({
      data: {
        utvVideoId: videoId,
        diff,
        reason: data.reason || null,
      },
    });
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-6 p-6">
        <Form
          rhf={rhf}
          className="flex flex-col gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(handleFormSubmit)(event);
          }}
        >
          <FormField
            control={control}
            name="title"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="disciplines"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Disciplines</FormLabel>
                <FormControl>
                  <DisciplineSelector
                    value={field.value ?? []}
                    onChange={(disciplines) =>
                      field.onChange(
                        disciplines.length > 0 ? disciplines : null,
                      )
                    }
                  />
                </FormControl>
                <FormDescription>
                  Select all disciplines shown in this video
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="riders"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Riders</FormLabel>
                <FormControl>
                  <RiderSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                <FormDescription>
                  Add riders featured in this video
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="reason"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Reason</FormLabel>
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

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                router.navigate({ to: "/vault/$videoId", params: { videoId } })
              }
            >
              Cancel
            </Button>
            <FormSubmitButton busy={createSuggestion.isPending}>
              Submit
            </FormSubmitButton>
          </div>
        </Form>
      </div>
    </div>
  );
}
