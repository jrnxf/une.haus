import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { setCookie, useSession } from "@tanstack/react-start/server";
import { env } from "~/lib/env";
import { SESSION_KEY } from "~/lib/keys";

export const serverFn = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useServerSession2();
  await session.update({
    silly: "myValue",
  });
  return {
    success: true,
  };
});

export const sillySet = {
  queryOptions: () => {
    return queryOptions({
      queryKey: ["silly2"],
      queryFn: serverFn,
    });
  },
  serverFn,
};

export const useServerSession2 = () => {
  return useSession({
    name: "silly2",
    password: env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
};
