import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { FilterIcon } from "lucide-react";
import { useMemo, useState } from "react";

import { Badges } from "~/components/badges";
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
import { ScrollArea } from "~/components/ui/scroll-area";
import { USER_DISCIPLINES } from "~/db/schema";
import { users } from "~/lib/users";
import { cn } from "~/lib/utils";

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

  const {
    data: usersPages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSuspenseInfiniteQuery(users.list.infiniteQueryOptions(searchParams));

  // const [selectedUserIdx, setSelectedUserIdx] = useState(-1);

  const displayedUsers = useMemo(() => usersPages.pages.flat(), [usersPages]);

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
    <div className="mx-auto flex w-full max-w-4xl grow overflow-hidden overflow-y-auto p-2">
      <ScrollArea
        className="flex w-full max-w-4xl grow overflow-hidden overflow-y-auto px-4"
        id="main-content"
      >
        <div className="mb-2 flex items-end justify-end gap-4">
          <FiltersTray />
        </div>
        <div className="flex flex-col gap-3">
          {displayedUsers.length === 0 && (
            <p className="text-muted-foreground">No users found</p>
          )}
          {displayedUsers.map((user) => {
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

                <Badges content={user.disciplines} />
              </Link>
            );
          })}
          {hasNextPage && (
            <Button className="shrink-0 self-start" onClick={fetchNextPage}>
              {isFetchingNextPage ? "Loading more..." : "Load more"}
            </Button>
          )}
        </div>
      </ScrollArea>
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
