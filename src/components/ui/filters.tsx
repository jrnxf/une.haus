"use client";

import { CheckIcon, FilterIcon, XIcon } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "~/components/ui/button";
import { ButtonGroup, ButtonGroupText } from "~/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

// --- Types ---

export type FilterOption<T = unknown> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
  className?: string;
};

export type FilterOperator = {
  value: string;
  label: string;
};

export type FilterFieldConfig<T = unknown> = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  type?: "select" | "multiselect" | "text";
  options?: FilterOption<T>[];
  operators?: FilterOperator[];
  defaultOperator?: string;
  placeholder?: string;
  searchable?: boolean;
  className?: string;
};

export type Filter<T = unknown> = {
  id: string;
  field: string;
  operator: string;
  values: T[];
};

// --- Helpers ---

export const createFilter = <T = unknown,>(
  field: string,
  operator?: string,
  values: T[] = [],
): Filter<T> => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
  field,
  operator: operator || "is",
  values,
});

const DEFAULT_OPERATORS: Record<string, FilterOperator[]> = {
  select: [
    { value: "is", label: "is" },
    { value: "is_not", label: "is not" },
  ],
  multiselect: [
    { value: "is_any_of", label: "includes" },
    { value: "includes_all", label: "is exactly" },
  ],
  text: [
    { value: "contains", label: "contains" },
    { value: "is", label: "is exactly" },
  ],
};

// --- Context ---

type FilterContextValue = {
  size: "sm" | "default";
};

const FilterContext = createContext<FilterContextValue>({ size: "default" });

// --- Components ---

function FilterOperatorDropdown<T = unknown>({
  field,
  operator,
  onChange,
}: {
  field: FilterFieldConfig<T>;
  operator: string;
  onChange: (operator: string) => void;
}) {
  const { size } = useContext(FilterContext);
  const operators =
    field.operators || DEFAULT_OPERATORS[field.type || "select"] || [];
  const operatorLabel =
    operators.find((op) => op.value === operator)?.label ||
    operator.replaceAll("_", " ");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="outline"
            size={size}
            className="text-muted-foreground hover:text-foreground"
          >
            {operatorLabel}
          </Button>
        }
      />
      <DropdownMenuContent align="start" className="w-fit min-w-fit">
        {operators.map((op) => (
          <DropdownMenuItem
            key={op.value}
            onClick={() => onChange(op.value)}
            className="flex items-center justify-between"
          >
            <span>{op.label}</span>
            <CheckIcon
              className={cn(
                "text-primary ml-4 size-4",
                op.value === operator ? "opacity-100" : "opacity-0",
              )}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function FilterValueSelector<T = unknown>({
  field,
  values,
  onChange,
}: {
  field: FilterFieldConfig<T>;
  values: T[];
  onChange: (values: T[]) => void;
}) {
  const { size } = useContext(FilterContext);
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (field.type === "text") {
    return (
      <input
        autoFocus
        value={(values[0] as string) || ""}
        onChange={(e) => onChange([e.target.value] as T[])}
        placeholder={field.placeholder}
        className={cn(
          "border-border bg-background text-foreground placeholder:text-muted-foreground dark:border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 w-36 rounded-md border bg-clip-padding px-3 text-base shadow-xs outline-none focus-visible:ring-3",
          size === "sm" ? "h-8" : "h-9",
        )}
      />
    );
  }

  const isMultiSelect = field.type === "multiselect" || values.length > 1;

  const selectedOptions =
    field.options?.filter((opt) => values.includes(opt.value)) || [];
  const unselectedOptions =
    field.options?.filter((opt) => !values.includes(opt.value)) || [];

  const filteredUnselected = unselectedOptions.filter((opt) =>
    opt.label.toLowerCase().includes(searchInput.toLowerCase()),
  );

  const allFiltered = [...selectedOptions, ...filteredUnselected];

  const displayLabel =
    selectedOptions.length === 1
      ? selectedOptions[0].label
      : selectedOptions.length > 0
        ? `${selectedOptions.length} selected`
        : "Select...";

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setTimeout(() => setSearchInput(""), 200);
      }}
    >
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size={size}>
            {displayLabel}
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        className={cn("w-[200px] px-0", field.className)}
      >
        {field.searchable !== false && (
          <>
            <Input
              ref={inputRef}
              placeholder={`search ${field.label.toLowerCase()}...`}
              className="h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <DropdownMenuSeparator />
          </>
        )}
        <div className="max-h-[min(var(--available-height),24rem)] overflow-y-auto overscroll-contain">
          {allFiltered.length === 0 && (
            <div className="text-muted-foreground py-2 text-center text-sm">
              No results found.
            </div>
          )}

          {selectedOptions.length > 0 && (
            <DropdownMenuGroup className="px-1">
              {selectedOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={String(option.value)}
                  checked={true}
                  className={option.className}
                  closeOnClick={!isMultiSelect}
                  onCheckedChange={() => {
                    const next = values.filter(
                      (v) => v !== option.value,
                    ) as T[];
                    onChange(next);
                    if (!isMultiSelect) setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          )}

          {selectedOptions.length > 0 && filteredUnselected.length > 0 && (
            <DropdownMenuSeparator className="mx-0" />
          )}

          {filteredUnselected.length > 0 && (
            <DropdownMenuGroup className="px-1">
              {filteredUnselected.map((option) => (
                <DropdownMenuCheckboxItem
                  key={String(option.value)}
                  checked={false}
                  className={option.className}
                  closeOnClick={!isMultiSelect}
                  onCheckedChange={() => {
                    const next = isMultiSelect
                      ? ([...values, option.value] as T[])
                      : ([option.value] as T[]);
                    onChange(next);
                    if (!isMultiSelect) setOpen(false);
                  }}
                >
                  <span className="truncate">{option.label}</span>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuGroup>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type FiltersProps<T = unknown> = {
  filters: Filter<T>[];
  fields: FilterFieldConfig<T>[];
  onChange: (filters: Filter<T>[]) => void;
  size?: "sm" | "default";
  trigger?: React.ReactNode;
  allowMultiple?: boolean;
  searchable?: boolean;
  className?: string;
};

export function Filters<T = unknown>({
  filters,
  fields,
  onChange,
  size = "default",
  trigger,
  allowMultiple = true,
  searchable = false,
  className,
}: FiltersProps<T>) {
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const menuInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (addFilterOpen) menuInputRef.current?.focus();
  }, [addFilterOpen]);

  const fieldsMap = useMemo(() => {
    const map: Record<string, FilterFieldConfig<T>> = {};
    for (const f of fields) map[f.key] = f;
    return map;
  }, [fields]);

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<Filter<T>>) => {
      onChange(
        filters.map((f) => (f.id === filterId ? { ...f, ...updates } : f)),
      );
    },
    [filters, onChange],
  );

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange(filters.filter((f) => f.id !== filterId));
    },
    [filters, onChange],
  );

  const addFilter = useCallback(
    (fieldKey: string) => {
      const field = fieldsMap[fieldKey];
      if (!field) return;
      const defaultOp =
        field.defaultOperator ||
        (field.type === "multiselect" ? "is_any_of" : "is");
      const newFilter = createFilter<T>(fieldKey, defaultOp);
      onChange([...filters, newFilter]);
      setAddFilterOpen(false);
      setMenuSearch("");
    },
    [fieldsMap, filters, onChange],
  );

  const selectableFields = useMemo(() => {
    return fields.filter((f) => {
      if (allowMultiple) return true;
      return !filters.some((filter) => filter.field === f.key);
    });
  }, [fields, filters, allowMultiple]);

  const filteredMenuFields = useMemo(() => {
    return selectableFields.filter(
      (f) =>
        !menuSearch || f.label.toLowerCase().includes(menuSearch.toLowerCase()),
    );
  }, [selectableFields, menuSearch]);

  const defaultTrigger = (
    <Button variant="outline" size={size}>
      <FilterIcon className="size-3.5" />
      filters
    </Button>
  );

  return (
    <FilterContext.Provider value={{ size }}>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        {selectableFields.length > 0 && (
          <DropdownMenu
            open={addFilterOpen}
            onOpenChange={(open) => {
              setAddFilterOpen(open);
              if (!open) {
                setMenuSearch("");
              }
            }}
          >
            <DropdownMenuTrigger
              render={(trigger || defaultTrigger) as React.ReactElement}
            />
            <DropdownMenuContent className="w-[220px]" align="start">
              {searchable && (
                <>
                  <Input
                    ref={menuInputRef}
                    placeholder="Filter..."
                    className="h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    value={menuSearch}
                    onChange={(e) => setMenuSearch(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  />
                  <DropdownMenuSeparator />
                </>
              )}
              <div className="max-h-[min(var(--available-height),24rem)] overflow-y-auto overscroll-contain">
                {filteredMenuFields.length === 0 ? (
                  <div className="text-muted-foreground py-2 text-center text-sm">
                    No filters found.
                  </div>
                ) : (
                  filteredMenuFields.map((field) => {
                    const hasSubMenu =
                      (field.type === "select" ||
                        field.type === "multiselect") &&
                      field.options?.length;

                    if (hasSubMenu) {
                      const isMultiSelect = field.type === "multiselect";
                      const fieldKey = field.key;
                      const existingFilter = filters.find(
                        (f) => f.field === fieldKey,
                      );
                      const currentValues = existingFilter?.values || [];

                      return (
                        <DropdownMenuSub key={fieldKey}>
                          <DropdownMenuSubTrigger>
                            {field.icon}
                            <span>{field.label}</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="w-[200px] px-0">
                            <SubMenuContent
                              field={field}
                              currentValues={currentValues}
                              isMultiSelect={isMultiSelect}
                              onToggle={(value, isSelected) => {
                                if (isMultiSelect) {
                                  const nextValues = isSelected
                                    ? (currentValues.filter(
                                        (v) => v !== value,
                                      ) as T[])
                                    : ([...currentValues, value] as T[]);

                                  if (existingFilter) {
                                    if (nextValues.length === 0) {
                                      onChange(
                                        filters.filter(
                                          (f) => f.id !== existingFilter.id,
                                        ),
                                      );
                                    } else {
                                      onChange(
                                        filters.map((f) =>
                                          f.id === existingFilter.id
                                            ? { ...f, values: nextValues }
                                            : f,
                                        ),
                                      );
                                    }
                                  } else {
                                    const newFilter = createFilter<T>(
                                      fieldKey,
                                      field.defaultOperator || "is_any_of",
                                      nextValues,
                                    );
                                    onChange([...filters, newFilter]);
                                  }
                                } else {
                                  const newFilter = createFilter<T>(
                                    fieldKey,
                                    field.defaultOperator || "is",
                                    [value] as T[],
                                  );
                                  onChange([...filters, newFilter]);
                                  setAddFilterOpen(false);
                                }
                              }}
                            />
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>
                      );
                    }

                    return (
                      <DropdownMenuItem
                        key={field.key}
                        onClick={() => addFilter(field.key)}
                      >
                        {field.icon}
                        <span>{field.label}</span>
                      </DropdownMenuItem>
                    );
                  })
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {filters.map((filter) => {
          const field = fieldsMap[filter.field];
          if (!field) return null;
          return (
            <ButtonGroup key={filter.id}>
              <ButtonGroupText className="border-border bg-background dark:border-input dark:bg-input/30 bg-clip-padding">
                {field.icon}
                {field.label.toLowerCase()}
              </ButtonGroupText>
              <FilterOperatorDropdown<T>
                field={field}
                operator={filter.operator}
                onChange={(operator) => updateFilter(filter.id, { operator })}
              />
              <FilterValueSelector<T>
                field={field}
                values={filter.values}
                onChange={(values) => updateFilter(filter.id, { values })}
              />
              <Button
                aria-label="Remove filter"
                variant="outline"
                size={size === "sm" ? "icon-sm" : "icon"}
                onClick={() => removeFilter(filter.id)}
              >
                <XIcon />
              </Button>
            </ButtonGroup>
          );
        })}
      </div>
    </FilterContext.Provider>
  );
}

// --- Submenu for select/multiselect in add-filter dropdown ---

function SubMenuContent<T = unknown>({
  field,
  currentValues,
  isMultiSelect,
  onToggle,
}: {
  field: FilterFieldConfig<T>;
  currentValues: T[];
  isMultiSelect: boolean;
  onToggle: (value: T, isSelected: boolean) => void;
}) {
  const [searchInput, setSearchInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    return (
      field.options?.filter((opt) => {
        if (currentValues.includes(opt.value)) return true;
        if (!searchInput) return true;
        return opt.label.toLowerCase().includes(searchInput.toLowerCase());
      }) || []
    );
  }, [field.options, searchInput, currentValues]);

  return (
    <>
      {field.searchable !== false && (
        <>
          <Input
            ref={inputRef}
            placeholder={`search ${field.label.toLowerCase()}...`}
            className="h-8 rounded-none border-0 bg-transparent! px-2 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          />
          <DropdownMenuSeparator />
        </>
      )}
      <div className="max-h-[min(var(--available-height),24rem)] overflow-y-auto overscroll-contain">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground py-2 text-center text-sm">
            No results found.
          </div>
        ) : (
          <DropdownMenuGroup>
            {filtered.map((option) => {
              const isSelected = currentValues.includes(option.value);
              return (
                <DropdownMenuCheckboxItem
                  key={String(option.value)}
                  checked={isSelected}
                  className={option.className}
                  closeOnClick={!isMultiSelect}
                  onCheckedChange={() =>
                    onToggle(option.value as T, isSelected)
                  }
                >
                  <span className="truncate">{option.label}</span>
                </DropdownMenuCheckboxItem>
              );
            })}
          </DropdownMenuGroup>
        )}
      </div>
    </>
  );
}
