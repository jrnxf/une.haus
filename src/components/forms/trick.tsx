import { Controller, useForm } from "react-hook-form";
import { Info } from "lucide-react";

import { zodResolver } from "@hookform/resolvers/zod";

import { MultiVideoInput } from "~/components/input/multi-video-input";
import { StringListInput } from "~/components/input/string-list-input";
import {
  ElementSelector,
  TrickRelationshipSelector,
} from "~/components/input/trick-selector";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "~/components/ui/field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import {
  trickFormSchema,
  type CreateTrickArgs,
  type TrickFormValues,
} from "~/lib/tricks/schemas";
import { generateSlug } from "~/lib/utils";

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
      muxAssetIds: defaultValues?.muxAssetIds ?? [],
      notes: defaultValues?.notes ?? null,
      prerequisites: defaultValues?.prerequisites ?? [],
      relatedTricks: defaultValues?.relatedTricks ?? [],
      elements: defaultValues?.elements ?? [],
    },
    resolver: zodResolver(trickFormSchema),
  });

  const { control, handleSubmit, setValue, formState } = rhf;

  const handleNameChange = (value: string) => {
    setValue("slug", generateSlug(value));
  };

  const handleFormSubmit = (data: TrickFormValues) => {
    const relationships = [
      ...data.prerequisites.map((r) => ({
        targetTrickId: r.targetTrickId,
        type: "prerequisite" as const,
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
      muxAssetIds: data.muxAssetIds,
      notes: data.notes,
      relationships,
      elementIds: data.elements.map((e) => e.id),
    });
  };

  const excludeIds = excludeTrickId ? [excludeTrickId] : [];

  return (
    <Form rhf={rhf} onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup>
        {/* Basic Info */}
        <FieldSet>
          <FieldLegend>Basic Info</FieldLegend>
          <FieldDescription>Core details about the trick</FieldDescription>
          <FieldGroup>
            <Controller
              name="slug"
              control={control}
              render={({ field }) => <input type="hidden" {...field} />}
            />

            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Name *</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    onChange={(e) => {
                      field.onChange(e);
                      handleNameChange(e.target.value);
                    }}
                    placeholder="treyflip"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="alternateNames"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Alternate Names</FieldLabel>
                  <StringListInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="Add alias..."
                  />
                  <FieldDescription>
                    Common aliases or nicknames
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="definition"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Definition</FieldLabel>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    placeholder="Describe how the trick is performed..."
                    rows={3}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="elements"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Elements</FieldLabel>
                  <ElementSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FieldDescription>
                    The components that make up this trick (e.g., spins, flips)
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Relationships */}
        <FieldSet>
          <FieldLegend>Relationships</FieldLegend>
          <FieldDescription>
            Connect this trick to other tricks in the database
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="prerequisites"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Prerequisites</FieldLabel>
                  <TrickRelationshipSelector
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={excludeIds}
                    relationshipType="prerequisite"
                  />
                  <FieldDescription>
                    Tricks that should be learned first
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="relatedTricks"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>Related Tricks</FieldLabel>
                  <TrickRelationshipSelector
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={excludeIds}
                    relationshipType="related"
                  />
                  <FieldDescription>
                    Similar tricks (one degree of separation)
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* History */}
        <FieldSet>
          <FieldLegend>History</FieldLegend>
          <FieldDescription>
            Origin and historical information about the trick
          </FieldDescription>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Controller
                name="inventedBy"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Invented By</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      aria-invalid={fieldState.invalid}
                      value={field.value ?? ""}
                      placeholder="Who invented this trick?"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Controller
                name="yearLanded"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Year Landed</FieldLabel>
                    <Input
                      type="number"
                      min={1900}
                      max={2100}
                      id={field.name}
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      aria-invalid={fieldState.invalid}
                      value={field.value?.toString() ?? ""}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? Number(e.target.value) : null,
                        )
                      }
                      placeholder="2010"
                    />
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </div>
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Videos */}
        <FieldSet>
          <FieldLegend>Videos</FieldLegend>
          <FieldDescription>
            Reference videos showing the trick being performed (up to 5)
          </FieldDescription>
          <FieldGroup>
            <Alert>
              <Info className="size-4" />
              <AlertDescription>
                Ideal videos are short clips showing the trick from different
                angles, slow motion views, or POV perspectives. All from the same
                rider in one edit is best!
              </AlertDescription>
            </Alert>
            <FormField
              control={control}
              name="muxAssetIds"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <MultiVideoInput
                      value={field.value}
                      onChange={field.onChange}
                      maxVideos={5}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FieldGroup>
        </FieldSet>

        <FieldSeparator />

        {/* Notes */}
        <FieldSet>
          <FieldLegend>Notes</FieldLegend>
          <FieldDescription>
            Additional information or context about the trick
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <Textarea
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    value={field.value ?? ""}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
          </FieldGroup>
        </FieldSet>

        {/* Actions */}
        <Field orientation="horizontal">
          <Button
            type="submit"
            disabled={isPending || formState.isSubmitting}
          >
            {isPending || formState.isSubmitting ? "Saving..." : submitLabel}
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </Field>
      </FieldGroup>
    </Form>
  );
}
