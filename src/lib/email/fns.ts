import { createServerFn } from "@tanstack/react-start";

import { sendMagicLinkSchema } from "~/lib/email/schemas";
import { env } from "~/lib/env";

import MagicLinkTemplate from "emails/magic-link";

import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { Resend } from "resend";
import { db } from "~/db";
import { magicLinks, users } from "~/db/schema";

const resend = new Resend(env.RESEND_API_KEY);
export const sendMagicLinkServerFn = createServerFn({
  method: "POST",
})
  .validator(sendMagicLinkSchema)
  .handler(async ({ data: input }) => {
    const userWithEmail = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!userWithEmail) {
      // we don't want to give potential attackers any information about
      // whether an email exists or not
      return;
    }

    const [token] = await db
      .insert(magicLinks)
      .values({
        email: userWithEmail.email,
        id: nanoid(),
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      })
      .returning();

    const { data, error } = await resend.emails.send({
      from: "Colby Thomas <colby@jrnxf.co>",
      to: [input.email],
      subject: "Welcome to une.haus!",
      react: MagicLinkTemplate({
        token: token.id,
        redirect: input.redirect,
      }),
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
