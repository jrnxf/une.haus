import { createServerFn } from "@tanstack/react-start";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Resend } from "resend";

import { db } from "~/db";
import { authCodes, users } from "~/db/schema";
import {
  enterCodeSchema,
  registerSchema,
  sendCodeSchema,
} from "~/lib/auth/schemas";
import { env } from "~/lib/env";
import { invariant } from "~/lib/invariant";
import { useServerSession } from "~/lib/session/hooks";

import AuthCodeTemplate from "../../../emails/auth-code";

const resendClient = new Resend(env.RESEND_API_KEY);

export const sendAuthCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(sendCodeSchema)
  .handler(async ({ data: input }) => {
    const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5);

    const [authCode] = await db
      .insert(authCodes)
      .values({
        email: input.email,
        id: nanoid(),
        code: String(Math.floor(Math.random() * 10_000)).padStart(4, "0"),
        expiresAt: inFiveMinutes,
      })
      .returning();

    const { data, error } = await resendClient.emails.send({
      from: "Colby Thomas <colby@jrnxf.co>",
      to: [input.email],
      subject: "Welcome to une.haus!",
      react: AuthCodeTemplate({ code: authCode.code }),
    });

    if (error) {
      console.error("❌ Email failed to send", error);
      // TODO: Log error to Sentry
      throw new Error(error.message);
    }

    if (data) {
      // log successful send to sentry
    }
  });

export const enterCodeServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(enterCodeSchema)
  .handler(async ({ data: input }) => {
    const { code } = input;

    const [authCode] = await db
      .select({
        id: authCodes.id,
        expiresAt: authCodes.expiresAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          bio: users.bio,
          disciplines: users.disciplines,
        },
      })
      .from(authCodes)
      .where(eq(authCodes.code, code))
      .leftJoin(users, eq(users.email, authCodes.email))
      .limit(1);

    if (!authCode) {
      throw new Error("Invalid code");
    }

    const deleteCode = async () => {
      await db.delete(authCodes).where(eq(authCodes.id, authCode.id));
    };

    if (!authCode.user) {
      await deleteCode();
      return {
        status: "user_not_found",
      };
    }

    if (authCode.expiresAt < new Date()) {
      await deleteCode();
      invariant(false, "Code has expired");
    }

    const [session] = await Promise.all([useServerSession(), deleteCode()]);

    await session.update({
      user: authCode.user,
    });

    return {
      status: "success",
    };
  });

export const registerServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(registerSchema)
  .handler(async ({ data: input }) => {
    const {
      // TODO use code
      // code,
      email,
      name,
      bio,
    } = input;

    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user) {
      throw new Error("User already exists");
    }

    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        bio,
      })
      .returning();

    if (!newUser) {
      throw new Error("Failed to create user");
    }

    const session = await useServerSession();

    await session.update({
      user: newUser,
    });
  });
