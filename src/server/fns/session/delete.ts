import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { SESSION_KEY } from "~/lib/keys";

import { useServerSession } from "~/lib/session";

export const serverFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useServerSession();
  await session.clear();
});

export const deleteSession = {
  queryOptions: () => {
    return queryOptions({
      queryKey: [SESSION_KEY],
      queryFn: serverFn,
    });
  },
  serverFn,
};
