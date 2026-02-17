import { useQuery } from "@tanstack/react-query";
import { ChevronDownIcon, Info, PlusIcon, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { zodResolver } from "@hookform/resolvers/zod";

import { MultiVideoInput } from "~/components/input/multi-video-input";
import { StringListInput } from "~/components/input/string-list-input";
import {
  ElementSelector,
  TrickRelationshipSelector,
} from "~/components/input/trick-selector";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
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
import { ResponsiveCombobox } from "~/components/ui/responsive-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import type { CATCH_TYPES } from "~/db/schema";
import { tricks } from "~/lib/tricks";
import {
  trickFormSchema,
  type CompositionFormValue,
  type CreateTrickArgs,
  type TrickFormValues,
} from "~/lib/tricks/schemas";
import { generateSlug } from "~/lib/utils";
import { useFzf } from "~/lib/ux/hooks/use-fzf";

export type TrickFormDefaultValues = Partial<TrickFormValues>;

export function TrickForm({
  defaultValues,
  onSubmit,
  onAdminSubmit,
  onCancel,
  submitLabel = "Save",
  isPending = false,
  excludeTrickId,
}: {
  defaultValues?: TrickFormDefaultValues;
  onSubmit: (data: CreateTrickArgs) => void;
  onAdminSubmit?: (data: CreateTrickArgs) => void;
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
      isCompound: defaultValues?.isCompound ?? false,
      compositions: defaultValues?.compositions ?? [],
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
      isCompound: data.isCompound,
      compositions: data.isCompound
        ? data.compositions.map((c) => ({
            componentTrickId: c.componentTrickId,
            position: c.position,
            catchType: c.catchType,
          }))
        : [],
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

        {/* Compound Trick */}
        <FieldSet>
          <FieldLegend>Compound</FieldLegend>
          <FieldDescription>
            A compound trick is made of multiple tricks joined by catches
          </FieldDescription>
          <FieldGroup>
            <Controller
              name="isCompound"
              control={control}
              render={({ field }) => (
                <div className="flex items-center justify-between">
                  <FieldLabel htmlFor={field.name}>Compound trick</FieldLabel>
                  <Switch
                    id={field.name}
                    checked={field.value}
                    onCheckedChange={(checked) => {
                      field.onChange(checked);
                      if (!checked) {
                        setValue("compositions", []);
                      }
                    }}
                  />
                </div>
              )}
            />

            {rhf.watch("isCompound") && (
              <Controller
                name="compositions"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>Components</FieldLabel>
                    <CompositionEditor
                      value={field.value}
                      onChange={field.onChange}
                      excludeIds={excludeIds}
                    />
                    <FieldDescription>
                      Select 2-3 component tricks with catch types between them
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}
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
                angles, slow motion views, or POV perspectives. All from the
                same rider in one edit is best!
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
        <div className="flex items-center justify-between">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          {!onCancel && <div />}
          {onAdminSubmit ? (
            <div className="flex">
              <Button
                type="submit"
                disabled={isPending || formState.isSubmitting}
                className="rounded-r-none"
              >
                {isPending || formState.isSubmitting
                  ? "Saving..."
                  : submitLabel}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    disabled={isPending || formState.isSubmitting}
                    className="rounded-l-none border-l-0 px-2"
                  >
                    <ChevronDownIcon className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleSubmit((data) => {
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
                      onAdminSubmit({
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
                        isCompound: data.isCompound,
                        compositions: data.isCompound
                          ? data.compositions.map((c) => ({
                              componentTrickId: c.componentTrickId,
                              position: c.position,
                              catchType: c.catchType,
                            }))
                          : [],
                      });
                    })}
                  >
                    Save as admin
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button
              type="submit"
              disabled={isPending || formState.isSubmitting}
            >
              {isPending || formState.isSubmitting ? "Saving..." : submitLabel}
            </Button>
          )}
        </div>
      </FieldGroup>
    </Form>
  );
}

type CatchType = (typeof CATCH_TYPES)[number];

function CompositionEditor({
  value,
  onChange,
  excludeIds = [],
}: {
  value: CompositionFormValue[];
  onChange: (compositions: CompositionFormValue[]) => void;
  excludeIds?: number[];
}) {
  const sorted = [...value].sort((a, b) => a.position - b.position);

  const handleAdd = (trick: { id: number; slug: string; name: string }) => {
    const newPosition = sorted.length;
    if (newPosition >= 3) return;
    onChange([
      ...value,
      {
        componentTrickId: trick.id,
        componentTrickSlug: trick.slug,
        componentTrickName: trick.name,
        position: newPosition,
        catchType: newPosition < 2 ? "two-foot" : null,
      },
    ]);
  };

  const handleRemove = (position: number) => {
    const filtered = value.filter((c) => c.position !== position);
    // Reindex positions
    const reindexed = filtered
      .sort((a, b) => a.position - b.position)
      .map((c, i) => ({
        ...c,
        position: i,
        // Last component has null catch type
        catchType: i < filtered.length - 1 ? (c.catchType ?? "two-foot") : null,
      }));
    onChange(reindexed);
  };

  const handleCatchChange = (position: number, catchType: CatchType) => {
    onChange(
      value.map((c) => (c.position === position ? { ...c, catchType } : c)),
    );
  };

  const selectedIds = value.map((c) => c.componentTrickId);

  return (
    <div className="flex flex-col gap-2">
      {sorted.map((comp, i) => (
        <div key={comp.position}>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 pr-1">
              {comp.componentTrickName}
              <button
                type="button"
                onClick={() => handleRemove(comp.position)}
                className="hover:bg-muted rounded-sm p-0.5"
              >
                <X className="size-3" />
              </button>
            </Badge>
          </div>
          {/* Catch type between components */}
          {i < sorted.length - 1 && (
            <div className="my-2 flex items-center gap-2 pl-4">
              <span className="text-muted-foreground text-xs">catch:</span>
              <Select
                value={comp.catchType ?? "two-foot"}
                onValueChange={(val) =>
                  handleCatchChange(comp.position, val as CatchType)
                }
              >
                <SelectTrigger size="sm" className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-foot">one-foot</SelectItem>
                  <SelectItem value="two-foot">two-foot</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      ))}

      {sorted.length < 3 && (
        <CompositionTrickPicker
          onSelect={handleAdd}
          excludeIds={[...excludeIds, ...selectedIds]}
        />
      )}
    </div>
  );
}

function CompositionTrickPicker({
  onSelect,
  excludeIds = [],
}: {
  onSelect: (trick: { id: number; slug: string; name: string }) => void;
  excludeIds?: number[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { data: allTricks = [] } = useQuery(
    tricks.search.queryOptions({ excludeIds, limit: 50 }),
  );

  // Filter out compound tricks (only simple tricks can be components)
  const availableTricks = useMemo(
    () =>
      allTricks.filter(
        (trick) =>
          !excludeIds.includes(trick.id) &&
          !("isCompound" in trick && trick.isCompound),
      ),
    [allTricks, excludeIds],
  );

  const searchReadyTricks = useMemo(
    () =>
      availableTricks.map((trick) => ({
        ...trick,
        searchKey: `${trick.name.toLowerCase()} ${trick.slug.toLowerCase()}`,
      })),
    [availableTricks],
  );

  const fzf = useFzf([searchReadyTricks, { selector: (t) => t.searchKey }]);
  const filteredTricks = query
    ? fzf.find(query.toLowerCase())
    : searchReadyTricks.map((item) => ({ item }));

  return (
    <ResponsiveCombobox
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setQuery("");
      }}
      title="Select component trick"
      trigger={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
        >
          <PlusIcon className="size-3.5" />
          Add
        </Button>
      }
    >
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="search tricks..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No tricks found</CommandEmpty>
          <CommandGroup>
            {filteredTricks.map(({ item: trick }) => (
              <CommandItem
                key={trick.id}
                value={trick.id.toString()}
                onSelect={() => {
                  onSelect(trick);
                  setOpen(false);
                }}
              >
                <span className="truncate">{trick.name}</span>
                <span className="text-muted-foreground ml-2 text-xs">
                  {trick.slug}
                </span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </Command>
    </ResponsiveCombobox>
  );
}
