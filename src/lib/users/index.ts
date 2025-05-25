import { queryOptions } from "@tanstack/react-query";
import { fns } from "~/lib/users/fns";
import { schemas } from "~/lib/users/schemas";
import { type ServerFnData } from "~/server/types";

export const users = {
  get: {
    fn: fns.get,
    schema: schemas.get,
    queryOptions: (data: ServerFnData<typeof fns.get>) => {
      return queryOptions({
        queryKey: ["user", data.userId],
        queryFn: () => fns.get({ data }),
      });
    },
  },
  update: {
    fn: fns.update,
    schema: schemas.update,
  },
};
