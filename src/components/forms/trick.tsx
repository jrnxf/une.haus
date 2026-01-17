import { useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { StringListInput } from "~/components/input/string-list-input";
import { TrickRelationshipSelector } from "~/components/input/trick-selector";
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
import {
  trickFormSchema,
  type TrickFormValues,
  type CreateTrickArgs,
} from "~/lib/tricks/schemas";

export type TrickFormDefaultValues = Partial<TrickFormValues>;

export function TrickForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isPending = false,
  excludeTrickId,
}: {
  defaultValues?: TrickFormDefaultValues;
  onSubmit: (data: CreateTrickArgs) => void;
  onCancel?: () => void;
  submitLabel?: string;
  isPending?: boolean;
  excludeTrickId?: number;
}) {
  const rhf = useForm<TrickFormValues>({
    defaultValues: {
      slug: defaultValues?.slug ?? "",
      name: defaultValues?.name ?? "",
      alternateNames: defaultValues?.alternateNames ?? [],
      definition: defaultValues?.definition ?? null,
      inventedBy: defaultValues?.inventedBy ?? null,
      yearLanded: defaultValues?.yearLanded ?? null,
      videoUrl: defaultValues?.videoUrl ?? null,
      videoTimestamp: defaultValues?.videoTimestamp ?? null,
      notes: defaultValues?.notes ?? null,
      prerequisites: defaultValues?.prerequisites ?? [],
      optionalPrerequisites: defaultValues?.optionalPrerequisites ?? [],
      relatedTricks: defaultValues?.relatedTricks ?? [],
    },
    resolver: zodResolver(trickFormSchema),
  });

  const { control, handleSubmit, setValue } = rhf;

  const handleNameChange = (value: string) => {
    // Auto-generate slug from name if slug is empty or matches previous auto-generation
    const currentSlug = rhf.getValues("slug");
    const previousAutoSlug = generateSlug(rhf.getValues("name"));

    if (!currentSlug || currentSlug === previousAutoSlug) {
      setValue("slug", generateSlug(value));
    }
  };

  const generateSlug = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

  const handleFormSubmit = (data: TrickFormValues) => {
    // Combine all relationships into a single array for the API
    const relationships = [
      ...data.prerequisites.map((r) => ({
        targetTrickId: r.targetTrickId,
        type: "prerequisite" as const,
      })),
      ...data.optionalPrerequisites.map((r) => ({
        targetTrickId: r.targetTrickId,
        type: "optional_prerequisite" as const,
      })),
      ...data.relatedTricks.map((r) => ({
        targetTrickId: r.targetTrickId,
        type: "related" as const,
      })),
    ];

    onSubmit({
      slug: data.slug,
      name: data.name,
      alternateNames: data.alternateNames,
      definition: data.definition,
      inventedBy: data.inventedBy,
      yearLanded: data.yearLanded,
      videoUrl: data.videoUrl,
      videoTimestamp: data.videoTimestamp,
      notes: data.notes,
      relationships,
    });
  };

  const excludeIds = excludeTrickId ? [excludeTrickId] : [];

  return (
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            control={control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name *</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e.target.value);
                    }}
                    placeholder="e.g., Hickflip"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="slug"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Slug *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., hickflip" />
                </FormControl>
                <FormDescription>URL-friendly identifier</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name="alternateNames"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Alternate Names</FormLabel>
              <FormControl>
                <StringListInput
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder="Add alias..."
                />
              </FormControl>
              <FormDescription>Common aliases or nicknames</FormDescription>
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
                  placeholder="Describe how the trick is performed..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Relationships */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Relationships</h3>

        <FormField
          control={control}
          name="prerequisites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prerequisites</FormLabel>
              <FormControl>
                <TrickRelationshipSelector
                  value={field.value}
                  onChange={field.onChange}
                  excludeIds={excludeIds}
                  relationshipType="prerequisite"
                  placeholder="Select prerequisite tricks..."
                />
              </FormControl>
              <FormDescription>
                Tricks that should be learned first
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="optionalPrerequisites"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Optional Prerequisites</FormLabel>
              <FormControl>
                <TrickRelationshipSelector
                  value={field.value}
                  onChange={field.onChange}
                  excludeIds={excludeIds}
                  relationshipType="optional_prerequisite"
                  placeholder="Select optional prerequisite tricks..."
                />
              </FormControl>
              <FormDescription>Helpful but not required</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="relatedTricks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Related Tricks</FormLabel>
              <FormControl>
                <TrickRelationshipSelector
                  value={field.value}
                  onChange={field.onChange}
                  excludeIds={excludeIds}
                  relationshipType="related"
                  placeholder="Select related tricks..."
                />
              </FormControl>
              <FormDescription>
                Similar tricks (one degree of separation)
              </FormDescription>
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
                  <Input
                    {...field}
                    value={field.value ?? ""}
                    placeholder="Who invented this trick?"
                  />
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
                    placeholder="e.g., 2010"
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
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="e.g., 1:30"
                />
              </FormControl>
              <FormDescription>Start time in the video</FormDescription>
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
                <Textarea
                  {...field}
                  value={field.value ?? ""}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <FormSubmitButton busy={isPending}>{submitLabel}</FormSubmitButton>
      </div>
    </Form>
  );
}
