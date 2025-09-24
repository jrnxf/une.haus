import { createServerFn } from "@tanstack/react-start";

import { eq } from "drizzle-orm";
import AuthCodeTemplate from "emails/auth-code";
import { nanoid } from "nanoid";
import { Resend } from "resend";

import { db } from "~/db";
import { authCodes, users } from "~/db/schema";
import { enterCodeSchema, sendCodeSchema } from "~/lib/email/schemas";
import { env } from "~/lib/env";
import { invariant } from "~/lib/invariant";
import { useServerSession } from "~/lib/session/hooks";

const resendClient = new Resend(env.RESEND_API_KEY);

export const sendMagicLinkServerFn = createServerFn({
  method: "POST",
})
  .validator(sendCodeSchema)
  .handler(async ({ data: input }) => {
    const userWithEmail = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!userWithEmail) {
      // we don't want to give potential attackers any information about
      // whether an email exists or not
      return;
    }

    const inFiveMinutes = new Date(Date.now() + 1000 * 60 * 5);

    const [authCode] = await db
      .insert(authCodes)
      .values({
        email: userWithEmail.email,
        id: nanoid(),
        code: Math.floor(Math.random() * 10_000),
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
  .validator(enterCodeSchema)
  .handler(async ({ data: input }) => {
    const { code } = input;

    const [authCode] = await db
      .select({
        id: authCodes.id,
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
      .where(eq(authCodes.code, Number(code)))
      .leftJoin(users, eq(users.email, authCodes.email))
      .limit(1);

    invariant(authCode.id, "Invalid code");
    invariant(authCode.user, "User not found");

    const session = await useServerSession();

    await session.update({
      user: authCode.user,
    });

    return {
      success: true,
    };
  });
