import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"

import { MentionTextarea } from "~/components/input/mention-textarea"
import { MultiVideoInput } from "~/components/input/multi-video-input"
import { SingleRiderSelector } from "~/components/input/single-rider-selector"
import { StringListInput } from "~/components/input/string-list-input"
import {
  ElementSelector,
  TrickRelationshipSelector,
} from "~/components/input/trick-selector"
import { Button } from "~/components/ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "~/components/ui/field"
import {
  Form,
  FormCancelButton,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "~/components/ui/form"
import { Input } from "~/components/ui/input"
import {
  type CreateTrickArgs,
  type TrickFormValues,
  trickFormSchema,
} from "~/lib/tricks/schemas"

export type TrickFormDefaultValues = Partial<TrickFormValues>

export function TrickForm({
  defaultValues,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isPending = false,
  excludeTrickId,
}: {
  defaultValues?: TrickFormDefaultValues
  onSubmit: (data: CreateTrickArgs) => void
  onCancel?: () => void
  submitLabel?: string
  isPending?: boolean
  excludeTrickId?: number
}) {
  const rhf = useForm<TrickFormValues>({
    defaultValues: {
      name: defaultValues?.name ?? "",
      alternateNames: defaultValues?.alternateNames ?? [],
      description: defaultValues?.description ?? null,
      inventedBy: defaultValues?.inventedBy ?? null,
      inventedByUserId: defaultValues?.inventedByUserId ?? null,
      yearLanded: defaultValues?.yearLanded ?? null,
      muxAssetIds: defaultValues?.muxAssetIds ?? [],
      notes: defaultValues?.notes ?? null,
      prerequisites: defaultValues?.prerequisites ?? [],
      relatedTricks: defaultValues?.relatedTricks ?? [],
      elements: defaultValues?.elements ?? [],
    },
    resolver: zodResolver(trickFormSchema),
  })

  const { control, handleSubmit, setValue, formState } = rhf

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
    ]

    onSubmit({
      name: data.name,
      alternateNames: data.alternateNames,
      description: data.description,
      inventedBy: data.inventedBy,
      inventedByUserId: data.inventedByUserId,
      yearLanded: data.yearLanded,
      muxAssetIds: data.muxAssetIds,
      notes: data.notes,
      relationships,
      elementIds: data.elements.map((e) => e.id),
    })
  }

  const excludeIds = excludeTrickId ? [excludeTrickId] : []

  return (
    <Form rhf={rhf} onSubmit={handleSubmit(handleFormSubmit)}>
      <FieldGroup>
        {/* Basic Info */}
        <FieldSet>
          <FieldLegend>basic info</FieldLegend>
          <FieldDescription>core details about the trick</FieldDescription>
          <FieldGroup>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>name</FieldLabel>
                  <Input
                    {...field}
                    id={field.name}
                    aria-invalid={fieldState.invalid}
                    placeholder="treyflip"
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="description"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>description</FieldLabel>
                  <MentionTextarea
                    id={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="describe how the trick is performed..."
                    rows={3}
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
                  <FieldLabel htmlFor={field.name}>alternate names</FieldLabel>
                  <StringListInput
                    value={field.value ?? []}
                    onChange={field.onChange}
                    placeholder="add alias..."
                  />
                  <FieldDescription>
                    common aliases or nicknames
                  </FieldDescription>
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
                  <FieldLabel htmlFor={field.name}>elements</FieldLabel>
                  <ElementSelector
                    value={field.value}
                    onChange={field.onChange}
                  />
                  <FieldDescription>
                    the components that make up this trick (e.g., spins, flips)
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
          <FieldLegend>relationships</FieldLegend>
          <FieldDescription>
            connect this trick to other tricks in the database
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="prerequisites"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={field.name}>prerequisites</FieldLabel>
                  <TrickRelationshipSelector
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={excludeIds}
                    relationshipType="prerequisite"
                  />
                  <FieldDescription>
                    tricks that should be (or usually are) learned first
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
                  <FieldLabel htmlFor={field.name}>related tricks</FieldLabel>
                  <TrickRelationshipSelector
                    value={field.value}
                    onChange={field.onChange}
                    excludeIds={excludeIds}
                    relationshipType="related"
                  />
                  <FieldDescription>
                    tricks that are closely related but not necessarily
                    prerequisites
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
          <FieldLegend>history</FieldLegend>
          <FieldDescription>
            origin and historical information about the trick
          </FieldDescription>
          <FieldGroup>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field>
                <FieldLabel>invented by</FieldLabel>
                <SingleRiderSelector
                  value={
                    rhf.watch("inventedBy") || rhf.watch("inventedByUserId")
                      ? {
                          userId: rhf.watch("inventedByUserId"),
                          name: rhf.watch("inventedBy"),
                        }
                      : null
                  }
                  onChange={(rider) => {
                    setValue("inventedBy", rider?.name ?? null)
                    setValue("inventedByUserId", rider?.userId ?? null)
                  }}
                  placeholder="who invented this trick?"
                />
              </Field>

              <Controller
                name="yearLanded"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>year landed</FieldLabel>
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
          <FieldLegend>videos</FieldLegend>
          <FieldDescription>
            reference videos showing the trick being performed (up to 5)
          </FieldDescription>
          <FieldGroup>
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
          <FieldLegend>notes</FieldLegend>
          <FieldDescription>
            additional information or context about the trick
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="notes"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <MentionTextarea
                    id={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    placeholder="additional notes..."
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
        <div className="flex items-center justify-end gap-2">
          {onCancel && (
            <FormCancelButton onClick={onCancel}>cancel</FormCancelButton>
          )}
          <Button type="submit" disabled={isPending || formState.isSubmitting}>
            {isPending || formState.isSubmitting
              ? "saving..."
              : submitLabel.toLowerCase()}
          </Button>
        </div>
      </FieldGroup>
    </Form>
  )
}
