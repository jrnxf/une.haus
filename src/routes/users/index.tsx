import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { EarthIcon, FilterIcon, UsersIcon, XIcon } from "lucide-react";
import { useDeferredValue, useMemo, useState } from "react";
import { preload } from "react-dom";
import { InView } from "react-intersection-observer";

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
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";
import { cn, getCloudflareImageUrl } from "~/lib/utils";

export const Route = createFileRoute("/users/")({
  validateSearch: users.list.schema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // Prefetch (non-blocking) - component handles suspense via useTransition
    context.queryClient.prefetchInfiniteQuery(
      users.list.infiniteQueryOptions(deps),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  // React state drives the query - NOT the URL
  const [query, setQuery] = useState(searchParams.name ?? "");
  const [disciplines, setDisciplines] = useState(
    searchParams.disciplines ?? [],
  );
  const deferredQuery = useDeferredValue(query);
  const deferredDisciplines = useDeferredValue(disciplines);

  const [filtersOpen, setFiltersOpen] = useState(
    Boolean(searchParams.name || searchParams.disciplines?.length),
  );

  const hasActiveFilters = Boolean(query || disciplines.length > 0);

  const debouncedNavigate = useDebounceCallback((name: string) => {
    router.navigate({
      to: "/users",
      search: (prev) => ({
        ...prev,
        name: name || undefined,
        id: undefined,
        cursor: undefined,
      }),
      replace: true,
    });
  }, 300);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    debouncedNavigate(value);
  };

  const handleDisciplinesChange = (
    newDisciplines: (typeof USER_DISCIPLINES)[number][],
  ) => {
    setDisciplines(newDisciplines);
    router.navigate({
      to: "/users",
      search: (prev) => ({
        ...prev,
        disciplines: newDisciplines.length > 0 ? newDisciplines : undefined,
        cursor: undefined,
      }),
      replace: true,
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
        deferredDisciplines.length > 0 ? deferredDisciplines : undefined,
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
              <Button variant="outline" size="sm">
                <EarthIcon className="size-4" />
                Map
              </Button>
            </Link>
          </div>
          {filtersOpen && (
            <div className="flex flex-col gap-3">
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search users..."
                  className="pr-8"
                />
                {query && (
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
                defaultSelections={searchParams.disciplines}
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
                <UsersIcon />
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
              <div className="flex flex-col gap-4 rounded-md border bg-white p-3 sm:flex-row dark:bg-[#0a0a0a]">
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
  );
}
