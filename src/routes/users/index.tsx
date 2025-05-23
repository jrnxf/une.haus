import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { useMemo, useState } from "react";

import {
  Tray,
  TrayClose,
  TrayContent,
  TrayTitle,
  TrayTrigger,
} from "~/components/tray";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { MultiSelect } from "~/components/ui/multi-select";
import { WrappedBadges } from "~/components/wrapped-badges";
import { USER_DISCIPLINES } from "~/db/schema";
import { useTRPC } from "~/integrations/trpc/react";
import { cn } from "~/lib/utils";
import { listUsers } from "~/server/fns/users/list";

export const Route = createFileRoute("/users/")({
  validateSearch: listUsers.schema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    const opts = context.trpc.user.list.infiniteQueryOptions(deps);

    await context.queryClient.prefetchInfiniteQuery(
      // listUsers.infiniteQueryOptions(deps),
      opts,
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const trpc = useTRPC();
  const searchParams = Route.useSearch();

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(
    trpc.user.list.infiniteQueryOptions(searchParams, {
      getNextPageParam: (lastPage) => {
        if (lastPage.length < 25) {
          // the last page returned less than the requested limit, so we
          // know there is no more results for this filter set
          return;
        }
        return lastPage.at(-1)?.id;
      },
    }),
  );

  // const [selectedUserIdx, setSelectedUserIdx] = useState(-1);

  const users = useMemo(() => usersPages.pages.flat(), [usersPages]);

  // const selectUser = (idx: number) => {
  //   setSelectedUserIdx(idx);
  // };

  // const selectedUser = users[selectedUserIdx];

  // const goToNextUser = () => {
  //   setSelectedUserIdx((selectedUserIdx + 1) % users.length);
  // };

  // const goToPreviousUser = () => {
  //   setSelectedUserIdx((selectedUserIdx - 1 + users.length) % users.length);
  // };

  return (
    <div
      className="mx-auto flex min-h-0 w-full max-w-4xl flex-col gap-3 p-3"
      id="main-content"
    >
      <div className="flex flex-col gap-3">
        <div className="flex justify-end gap-2">
          <FiltersTray />
        </div>
        {users.length === 0 && (
          <p className="text-muted-foreground">No users found</p>
        )}
        {users.map((user) => {
          return (
            <Link
              key={user.id}
              to="/users/$userId"
              params={{ userId: user.id }}
              className={cn(
                "w-full space-y-2 rounded-md border bg-white p-3 text-left dark:bg-[#0a0a0a]",
                "ring-offset-background",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-hidden",
              )}
              data-user-name={user.name}
              // onClick={() => selectUser(idx)}
            >
              <div className="flex items-center gap-2">
                <Avatar className="size-6 rounded-full">
                  <AvatarImage alt={user.name} src={user.avatarUrl} />
                  <AvatarFallback className="text-xs" name={user.name} />
                </Avatar>
                <p className="truncate text-base">{user.name}</p>
              </div>
              {user.bio && (
                <p className="text-muted-foreground line-clamp-3 text-sm">
                  {user.bio}
                </p>
              )}

              <WrappedBadges content={user.disciplines} />
            </Link>
          );
        })}
      </div>
      {hasNextPage && (
        <Button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? "Loading..." : "Load more"}
        </Button>
      )}
    </div>
  );
}

function FiltersTray() {
  const searchParams = Route.useSearch();
  const router = useRouter();

  const [query, setQuery] = useState(searchParams.q);
  const [disciplines, setDisciplines] = useState(searchParams.disciplines);

  return (
    <Tray>
      <TrayTrigger asChild>
        <Button variant="outline">
          Filters <FilterIcon className="size-4" />
        </Button>
      </TrayTrigger>
      <TrayContent>
        <TrayTitle>Filters</TrayTitle>
        <div className="flex flex-col items-start gap-3">
          <Input
            className="w-64"
            id="search"
            onChange={(evt) => setQuery(evt.target.value)}
            placeholder="Search users"
            value={query}
          />
          <div className="w-64">
            <MultiSelect
              buttonLabel="Disciplines"
              onOptionCheckedChange={(option, checked) => {
                if (checked) {
                  setDisciplines([...(disciplines ?? []), option]);
                } else {
                  setDisciplines(
                    (disciplines ?? []).filter((d) => d !== option),
                  );
                }
              }}
              options={USER_DISCIPLINES}
              selections={disciplines ?? []}
            />
          </div>

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
              <Button
                onClick={() => {
                  router.navigate({
                    to: "/users",
                    search: {
                      q: query,
                      disciplines,
                    },
                    replace: true,
                  });
                }}
              >
                Apply
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
