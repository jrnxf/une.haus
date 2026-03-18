import { useDebouncedCallback } from "@tanstack/react-pacer"
import { useCallback, useDeferredValue, useMemo, useState } from "react"

import {
  type ActiveFilter,
  type FilterField,
} from "~/components/filters/filters"

/**
 * Normalizes multiselect operator values from the Filters component
 * into the two canonical values used by the backend.
 */
export function normalizeMultiOperator(operator?: string): "contain" | "equal" {
  if (
    operator === "equal" ||
    operator === "includes_all" ||
    operator === "is"
  ) {
    return "equal"
  }
  return "contain"
}

type UseFilteredListConfig = {
  fields: FilterField[]
  searchParams: Record<string, unknown>
  navigate: (opts: {
    search: Record<string, unknown>
    replace: boolean
  }) => void
  wait?: number
}

/**
 * Manages the local state + debounced URL sync for filtered list pages.
 *
 * Encapsulates the repeated pattern of: local state for instant input
 * feedback → debounced navigate to update URL → useDeferredValue to
 * prevent suspense flash.
 */
export function useFilteredList({
  fields,
  searchParams,
  navigate,
  wait = 200,
}: UseFilteredListConfig) {
  // --- Local state for instant feedback ---
  const [localValues, setLocalValues] = useState<
    Record<string, string | string[]>
  >(() => {
    const init: Record<string, string | string[]> = {}
    for (const field of fields) {
      const v = searchParams[field.key]
      init[field.key] =
        field.type === "text" ? ((v as string) ?? "") : ((v as string[]) ?? [])
    }
    return init
  })

  // Operator state for multiselect fields
  const [operators, setOperators] = useState<
    Record<string, "contain" | "equal">
  >(() => {
    const init: Record<string, "contain" | "equal"> = {}
    for (const field of fields) {
      if (field.type === "multiselect") {
        init[field.key] =
          field.defaultOperator === "equal" ? "equal" : "contain"
      }
    }
    return init
  })

  // Track which fields are active (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const field of fields) {
      const v = localValues[field.key]
      if (field.type === "text" && v) initial.add(field.key)
      if (field.type === "multiselect" && Array.isArray(v) && v.length > 0)
        initial.add(field.key)
    }
    return initial
  })

  // --- Debounced URL update ---
  const debouncedNavigate = useDebouncedCallback(
    (updates: Record<string, unknown>) => {
      navigate({ search: updates, replace: true })
    },
    { wait },
  )

  // --- Deferred search params (prevents suspense flash) ---
  const deferredParams = useDeferredValue(searchParams)

  // --- Derived ActiveFilter[] from local state ---
  const filters = useMemo<ActiveFilter[]>(() => {
    const result: ActiveFilter[] = []
    for (const field of fields) {
      const value = localValues[field.key]
      if (field.type === "text") {
        if (activeFields.has(field.key)) {
          result.push({
            id: field.key,
            field: field.key,
            operator: field.defaultOperator ?? "contains",
            values: value ? [value as string] : [],
          })
        }
      } else if (field.type === "multiselect") {
        const arr = value as string[]
        if (activeFields.has(field.key) || arr.length > 0) {
          result.push({
            id: field.key,
            field: field.key,
            operator: operators[field.key] ?? "contain",
            values: arr,
          })
        }
      }
    }
    return result
  }, [fields, localValues, activeFields, operators])

  // --- Handle changes from <Filters> component ---
  const handleFiltersChange = useCallback(
    (next: ActiveFilter[]) => {
      // Update active fields
      setActiveFields(() => {
        const s = new Set<string>()
        for (const f of next) s.add(f.field)
        return s
      })

      const newValues: Record<string, string | string[]> = {}
      const newOps: Record<string, "contain" | "equal"> = {}
      const navUpdates: Record<string, unknown> = {}

      for (const field of fields) {
        const filter = next.find((f) => f.field === field.key)
        if (field.type === "text") {
          const v = filter?.values[0] || ""
          newValues[field.key] = v
          navUpdates[field.key] = v || undefined
        } else if (field.type === "multiselect") {
          const arr = filter && filter.values.length > 0 ? filter.values : []
          newValues[field.key] = arr
          navUpdates[field.key] = arr.length > 0 ? arr : undefined
          if (filter) {
            newOps[field.key] = normalizeMultiOperator(filter.operator)
          }
        }
      }

      setLocalValues((prev) => ({ ...prev, ...newValues }))
      setOperators((prev) => ({ ...prev, ...newOps }))
      debouncedNavigate(navUpdates)
    },
    [fields, debouncedNavigate],
  )

  // --- Query params from deferred URL values ---
  const queryParams = useMemo(() => {
    const params: Record<string, string | string[] | undefined> = {}
    for (const field of fields) {
      const v = deferredParams[field.key]
      if (field.type === "text") {
        params[field.key] = (v as string) || undefined
      } else if (field.type === "multiselect") {
        const arr = v as string[] | undefined
        params[field.key] = arr && arr.length > 0 ? arr : undefined
      }
    }
    return params
  }, [fields, deferredParams])

  return {
    /** The field definitions to pass to <Filters> */
    filterFields: fields,
    /** Active filters derived from local state — pass to <Filters> */
    filters,
    /** Callback for <Filters onFiltersChange> */
    handleFiltersChange,
    /** Deferred query params for useSuspenseInfiniteQuery */
    queryParams,
    /** Current multiselect operator per field key (for client-side "equal" filtering) */
    operators,
  }
}
