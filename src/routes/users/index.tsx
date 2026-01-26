import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { EarthIcon, FilterIcon, GhostIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { preload } from "react-dom";
import { InView } from "react-intersection-observer";

import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useDebounceCallback } from "usehooks-ts";

import { Badges } from "~/components/badges";
import { BadgeInput } from "~/components/input/badge-input";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { Input } from "~/components/ui/input";
import { USER_DISCIPLINES, type UserDiscipline } from "~/db/schema";
import { users } from "~/lib/users";
import { cn, getCloudflareImageUrl } from "~/lib/utils";

const searchParamsParsers = {
  name: parseAsString,
  disciplines: parseAsArrayOf(parseAsString),
};

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
  const [{ name, disciplines }, setParams] = useQueryStates(
    searchParamsParsers,
    { shallow: true, history: "replace" },
  );

  // inputValue: immediate feedback for the input field
  // deferredQuery/deferredDisciplines: deferred to prevent UI disappearance during suspense
  const [inputValue, setInputValue] = useState(name ?? "");
  const deferredQuery = useDeferredValue(inputValue);
  const deferredDisciplines = useDeferredValue(disciplines ?? []);

  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(name || disciplines?.length),
  );

  const hasActiveFilters = Boolean(
    inputValue || (disciplines?.length ?? 0) > 0,
  );

  // Debounced URL sync for bookmarking
  const debouncedSetParams = useDebounceCallback((value: string) => {
    setParams({ name: value || null });
  }, 200);

  const handleQueryChange = (value: string) => {
    setInputValue(value);
    debouncedSetParams(value);
  };

  const handleDisciplinesChange = (
    newDisciplines: (typeof USER_DISCIPLINES)[number][],
  ) => {
    setParams({
      disciplines: newDisciplines.length > 0 ? newDisciplines : null,
    });
  };

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    users.list.infiniteQueryOptions({
      name: deferredQuery || undefined,
      disciplines:
        deferredDisciplines.length > 0
          ? (deferredDisciplines as UserDiscipline[])
          : undefined,
    }),
  );

  const displayedUsers = useMemo(() => usersPages.pages.flat(), [usersPages]);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  return (
    <div className="overflow-y-auto" ref={setScrollRoot}>
      <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => setFiltersOpen(!filtersOpen)}
              className="relative"
            >
              <FilterIcon className="size-4" />
              Filters
              {hasActiveFilters && !filtersOpen && (
                <span className="bg-primary absolute -top-1 -right-1 size-2 rounded-full" />
              )}
            </Button>
            <Link to="/map">
              <Button variant="outline">
                <EarthIcon className="size-4" />
                Map
              </Button>
            </Link>
          </div>
          {filtersOpen && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Input
                  value={inputValue}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="search users..."
                  className="pr-8"
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                  >
                    <XIcon className="size-4" />
                  </button>
                )}
              </div>
              <BadgeInput
                defaultSelections={
                  (disciplines as UserDiscipline[]) ?? undefined
                }
                onChange={handleDisciplinesChange}
                options={USER_DISCIPLINES}
              />
            </div>
          )}
        </div>

        {displayedUsers.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <GhostIcon />
              </EmptyMedia>
              <EmptyTitle>No users</EmptyTitle>
              <EmptyDescription>
                There are no users to display at the moment.
              </EmptyDescription>
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
                  <Badges
                    content={user.disciplines}
                    active={disciplines ?? undefined}
                  />
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
  );
}
