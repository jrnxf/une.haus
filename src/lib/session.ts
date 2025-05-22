import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  rootRouteId,
  useNavigate,
  useRouteContext,
  useRouter,
} from "@tanstack/react-router";
import { serverOnly } from "@tanstack/react-start";
import { getWebRequest } from "@tanstack/react-start/server";
import cookie from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { z } from "zod";
import { useTRPC } from "~/integrations/trpc/react";
import { env } from "~/lib/env";

export const HAUS_SESSION_KEY = "haus_session";

export const hausSessionSchema = z.object({
  flash: z.string().optional(),
  user: z
    .object({
      avatarUrl: z.string().nullable(),
      email: z.string().email(),
      id: z.number(),
      name: z.string(),
    })
    .optional(),
});

export const useServerSession = serverOnly(async (): Promise<HausSession> => {
  const request = getWebRequest();
  if (request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookie.parse(cookieHeader);
      const session = await decrypt(cookies[HAUS_SESSION_KEY]);

      const parsedSession = hausSessionSchema.safeParse(session);

      if (parsedSession.success) {
        return parsedSession.data;
      }
    }
  }
  return {
    user: undefined,
    flash: undefined,
  };
});

export type HausSession = z.infer<typeof hausSessionSchema>;
export type HausSessionUser = HausSession["user"];

export function useSessionUser() {
  const { session } = useRouteContext({ from: rootRouteId });
  return session.user;
}

export function useSessionFlash() {
  const { session } = useRouteContext({ from: rootRouteId });
  return session.flash;
}

export function useLogout() {
  const trpc = useTRPC();
  const router = useRouter();
  const navigate = useNavigate();

  const qc = useQueryClient();

  const { mutate } = useMutation(
    trpc.auth.logout.mutationOptions({
      onMutate: async () => {
        qc.cancelQueries({ queryKey: trpc.session.get.queryKey() });
      },
      onSuccess: async () => {
        qc.setQueryData(trpc.session.get.queryKey(), (prev) => ({
          ...prev,
          user: undefined,
        }));

        await router.invalidate();

        navigate({ to: "/auth/login" });
      },
      onSettled: () => {
        qc.invalidateQueries({ queryKey: trpc.session.get.queryKey() });
      },
    }),
  );

  return mutate;
}

const BASE_AUTH_COOKIE = {
  domain: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "localhost",
  httpOnly: true,
  name: "session",
  path: "/",
  sameSite: "lax",
  secure: true,
} as const;

export async function encrypt(payload: HausSession) {
  const key = new TextEncoder().encode(env.SESSION_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(key);
}

export async function decrypt(session = "") {
  const key = new TextEncoder().encode(env.SESSION_SECRET);
  try {
    const { payload } = await jwtVerify<HausSession>(session, key, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

export async function createSession(
  sessionData: HausSession,
  res: { headers: Headers },
) {
  const session = await encrypt(sessionData);

  await setAuthCookie(session, res);
}

export async function serializeSession(session: string) {
  const expires = new Date(Date.now() + 60 * 60 * 1000 * 300); // in 1 hour

  const serializedSession = cookie.serialize(HAUS_SESSION_KEY, session, {
    ...BASE_AUTH_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    expires,
  });

  return serializedSession;
}

async function setAuthCookie(session: string, res: { headers: Headers }) {
  const expires = new Date(Date.now() + 60 * 60 * 1000 * 300); // in 1 hour

  const serializedSession = cookie.serialize(HAUS_SESSION_KEY, session, {
    ...BASE_AUTH_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    expires,
  });

  res.headers.set("Set-Cookie", serializedSession);
}

export async function deleteSession(res: { headers: Headers }) {
  res.headers.set(
    "Set-Cookie",
    cookie.serialize(HAUS_SESSION_KEY, "", {
      ...BASE_AUTH_COOKIE,
      maxAge: 0,
    }),
  );
}
