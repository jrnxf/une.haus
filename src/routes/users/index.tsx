import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { GhostIcon } from "lucide-react";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import { preload } from "react-dom";
import { InView } from "react-intersection-observer";

import { useDebounceCallback } from "usehooks-ts";

import { Badges } from "~/components/badges";
import { PageHeader } from "~/components/page-header";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import {
  Filters,
  type Filter,
  type FilterFieldConfig,
} from "~/components/ui/filters";
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";
import { cn, getCloudflareImageUrl } from "~/lib/utils";

export const Route = createFileRoute("/users/")({
  validateSearch: users.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureInfiniteQueryData(
      users.list.infiniteQueryOptions(deps),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  // --- Text filter: local state for immediate input feedback ---
  const [nameInput, setNameInput] = useState(searchParams.name ?? "");
  const deferredName = useDeferredValue(nameInput);

  // URL update is for bookmarking only — debounced so it doesn't fire on every keystroke
  const debouncedNavigate = useDebounceCallback(
    (updates: { name?: string; disciplines?: string[] }) => {
      router.navigate({
        to: "/users",
        search: (prev) => ({
          ...prev,
          name: updates.name || undefined,
          disciplines:
            updates.disciplines && updates.disciplines.length > 0
              ? updates.disciplines
              : undefined,
          cursor: undefined,
        }),
        replace: true,
      });
    },
    300,
  );

  // --- Multiselect filter: local state, deferred for query ---
  const [disciplines, setDisciplines] = useState<string[]>(
    searchParams.disciplines ?? [],
  );
  const deferredDisciplines = useDeferredValue(disciplines);

  // Track which filter fields are open (text filters can be open with empty value)
  const [activeFields, setActiveFields] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (nameInput) initial.add("name");
    if (disciplines.length > 0) initial.add("disciplines");
    return initial;
  });

  const filterFields: FilterFieldConfig<string>[] = useMemo(
    () => [
      {
        key: "name",
        label: "Name",
        type: "text" as const,
        placeholder: "search...",
        operators: [{ value: "contains", label: "contains" }],
        defaultOperator: "contains",
      },
      {
        key: "disciplines",
        label: "Disciplines",
        type: "multiselect" as const,
        operators: [{ value: "includes_all", label: "includes" }],
        defaultOperator: "includes_all",
        options: USER_DISCIPLINES.map((d) => ({ value: d, label: d })),
      },
    ],
    [],
  );

  // Derive filters from LOCAL state (immediate feedback, not URL)
  const filters = useMemo<Filter<string>[]>(() => {
    const result: Filter<string>[] = [];
    if (activeFields.has("name")) {
      result.push({
        id: "name",
        field: "name",
        operator: "contains",
        values: nameInput ? [nameInput] : [],
      });
    }
    if (activeFields.has("disciplines") || disciplines.length > 0) {
      result.push({
        id: "disciplines",
        field: "disciplines",
        operator: "includes_all",
        values: disciplines,
      });
    }
    return result;
  }, [nameInput, disciplines, activeFields]);

  const handleFiltersChange = useCallback(
    (next: Filter<string>[]) => {
      const nameFilter = next.find((f) => f.field === "name");
      const discFilter = next.find((f) => f.field === "disciplines");

      setActiveFields((prev) => {
        const wantName = Boolean(nameFilter);
        const wantDisc = Boolean(discFilter);
        if (
          prev.has("name") === wantName &&
          prev.has("disciplines") === wantDisc
        ) {
          return prev;
        }
        const s = new Set<string>();
        if (wantName) s.add("name");
        if (wantDisc) s.add("disciplines");
        return s;
      });

      // Text: update local state immediately (URL updates via debounce)
      const newName = nameFilter?.values[0] || "";
      setNameInput(newName);

      // Multiselect: update local state immediately
      const newDisc =
        discFilter && discFilter.values.length > 0 ? discFilter.values : [];
      setDisciplines(newDisc);

      // Debounce URL update for text, immediate for multiselect removal/addition
      // (both go through the same debounced navigate for simplicity)
      debouncedNavigate({ name: newName, disciplines: newDisc });
    },
    [debouncedNavigate],
  );

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    users.list.infiniteQueryOptions({
      name: deferredName || undefined,
      disciplines:
        deferredDisciplines.length > 0 ? deferredDisciplines : undefined,
    }),
  );

  const displayedUsers = useMemo(() => usersPages.pages.flat(), [usersPages]);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <PageHeader maxWidth="max-w-4xl">
        <PageHeader.Breadcrumbs>
          <PageHeader.Crumb>users</PageHeader.Crumb>
        </PageHeader.Breadcrumbs>
      </PageHeader>

      <div className="overflow-y-auto" ref={setScrollRoot}>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4">
          <Filters
            filters={filters}
            fields={filterFields}
            onChange={handleFiltersChange}
            size="sm"
          />

          {displayedUsers.length === 0 && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <GhostIcon />
                </EmptyMedia>
                <EmptyTitle>no users</EmptyTitle>
                <EmptyDescription>try adjusting your filters</EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}

          {displayedUsers.map((user, idx) => {
            return (
              <Link
                key={user.id}
                to="/users/$userId"
                params={{ userId: user.id }}
                onMouseEnter={() => {
                  if (user.avatarId) {
                    preload(
                      getCloudflareImageUrl(user.avatarId, {
                        width: 448,
                        quality: 60,
                      }),
                      { as: "image", fetchPriority: "high" },
                    );
                  }
                }}
                className={cn(
                  "ring-offset-background focus-visible:ring-ring rounded-md focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
                )}
                data-user-name={user.name}
              >
                <div className="bg-card flex flex-col gap-4 rounded-md border p-3 sm:flex-row">
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex items-center gap-2">
                      {/* <Avatar className="size-6 rounded-full">
                    <AvatarImage alt={user.name} src={user.avatarId} />
                    <AvatarFallback className="text-xs" name={user.name} />
                  </Avatar> */}
                      {user.avatarId && (
                        <img
                          src={getCloudflareImageUrl(user.avatarId, {
                            width: 72,
                            quality: 70,
                          })}
                          alt={user.name}
                          fetchPriority="high"
                          loading={idx < 6 ? "eager" : "lazy"}
                          className="size-6 rounded-full"
                        />
                      )}
                      <p className="truncate text-base font-semibold">
                        {user.name}
                      </p>
                    </div>
                    {user.bio && (
                      <div className="line-clamp-3 text-sm">
                        <p>{user.bio}</p>
                      </div>
                    )}
                    <Badges content={user.disciplines} />
                  </div>
                </div>
              </Link>
            );
          })}
          {hasNextPage && !isFetchingNextPage && (
            <InView
              root={scrollRoot}
              rootMargin="1000px"
              onChange={(inView) => inView && fetchNextPage()}
            />
          )}
        </div>
      </div>
    </>
  );
}
