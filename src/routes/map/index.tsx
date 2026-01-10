import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { users } from "~/lib/users";
import { MapView } from "~/views/map";

export const Route = createFileRoute("/map/")({
  loader: async ({ context }) => {
    return await context.queryClient.ensureQueryData(
      users.withLocations.queryOptions(),
    );
  },
  component: RouteComponent,
});

function RouteComponent() {
  const { data } = useSuspenseQuery(users.withLocations.queryOptions());
  return <MapView users={data} />;
}
