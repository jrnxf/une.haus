import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { InView } from "react-intersection-observer";

import { Badges } from "~/components/badges";
import { BadgeInput } from "~/components/input/badge-input";
import { UserSelector } from "~/components/input/user-selector";
import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray";
import { Button } from "~/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "~/components/ui/empty";
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";
import { cn } from "~/lib/utils";

export const Route = createFileRoute("/users/")({
  validateSearch: users.list.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    return await context.queryClient.ensureInfiniteQueryData(
      users.list.infiniteQueryOptions(deps),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const searchParams = Route.useSearch();

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(users.list.infiniteQueryOptions(searchParams));

  const displayedUsers = useMemo(() => usersPages.pages.flat(), [usersPages]);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

  return (
    <div className="overflow-y-auto" ref={setScrollRoot}>
      <div className="mx-auto grid max-w-4xl grid-cols-1 grid-rows-[auto_1fr] gap-4 p-4">
        <div className="flex items-end justify-between gap-4">
          <div className="sticky top-3 z-10 self-end">
            <FiltersTray />
          </div>
        </div>

        {displayedUsers.length === 0 && (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FilterIcon />
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
                        src={`https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/${user.avatarId}/width=72,quality=70`}
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

function FiltersTray() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  const [disciplines, setDisciplines] = useState(searchParams.disciplines);
  const [selectedUserId, setSelectedUserId] = useState<number | undefined>(
    searchParams.id,
  );

  return (
    <Tray>
      <TrayTrigger asChild>
        <Button variant="outline">
          Filters <FilterIcon className="size-4" />
        </Button>
      </TrayTrigger>
      <TrayContent>
        <div className="flex flex-col items-start gap-3">
          <TrayTitle className="text-lg">Filters</TrayTitle>
          <label htmlFor="user-selector">User</label>
          <UserSelector
            initialSelectedUserId={searchParams.id}
            onSelect={(user) => {
              setSelectedUserId(user?.id);
            }}
          />

          <label htmlFor="disciplines">Disciplines</label>
          <BadgeInput
            defaultSelections={disciplines}
            onChange={setDisciplines}
            options={USER_DISCIPLINES}
          />

          <div className="flex w-full justify-end gap-2">
            <TrayClose asChild>
              <Button
                variant="secondary"
                onClick={() => {
                  router.navigate({ to: "/users", replace: true });
                }}
              >
                Reset
              </Button>
            </TrayClose>
            <TrayClose asChild>
              <Button asChild>
                <Link
                  to="/users"
                  replace
                  search={{ id: selectedUserId, disciplines }}
                >
                  Apply
                </Link>
              </Button>
            </TrayClose>
          </div>
        </div>
      </TrayContent>
    </Tray>
  );
}

// function UpDownArrows({
//   goToNext,
//   goToPrevious,
// }: React.HTMLAttributes<HTMLDivElement> & {
//   goToNext: () => void;
//   goToPrevious: () => void;
// }) {
//   useEventListener("keydown", (e) => {
//     if (e.key === "ArrowDown") {
//       goToNext();
//     } else if (e.key === "ArrowUp") {
//       goToPrevious();
//     }
//   });

//   return (
//     <>
//       <Button onClick={goToNext} size="icon" variant="outline">
//         <ArrowDownIcon className="size-4" />
//       </Button>
//       <Button onClick={goToPrevious} size="icon" variant="outline">
//         <ArrowUpIcon className="size-4" />
//       </Button>
//     </>
//   );
// }
