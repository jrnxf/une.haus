import { useMutation } from "@tanstack/react-query";
import {
  rootRouteId,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";
import { createServerOnlyFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";

import { env } from "~/lib/env";
import { HAUS_SESSION_KEY, session } from "~/lib/session/index";
import { type HausSession } from "~/lib/session/schema";

export const useServerSession = createServerOnlyFn(() => {
  return useSession<HausSession>({
    name: HAUS_SESSION_KEY,
    password: env.SESSION_SECRET,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
});

export function useSessionUser() {
  const { session } = useRouteContext({ from: rootRouteId });
  return session.user;
}

export function useIsAdmin() {
  const user = useSessionUser();
  return user && user.id === 1;
}

export function useSessionFlash() {
  const { session } = useRouteContext({ from: rootRouteId });
  return session.flash;
}

export function useRootRouteContext() {
  return useRouteContext({ from: rootRouteId });
}

export function useLogout() {
  const navigate = useNavigate();

  const { mutate } = useMutation({
    mutationFn: session.clear.fn,
    onSuccess: () => {
      navigate({ to: "/auth/code/send" });
    },
  });

  return mutate;
}
