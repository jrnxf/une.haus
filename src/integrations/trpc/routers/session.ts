import { type TRPCRouterRecord } from "@trpc/server";
import { z } from "zod";
import { publicProcedure } from "~/integrations/trpc/init";
import { useServerSession } from "~/lib/session";

export const sessionRouter = {
  get: publicProcedure.query(async () => {
    const session = await useServerSession();

    const flashMessage = session.data.flash;

    console.log("flashMessage", flashMessage);

    if (flashMessage) {
      // clear the flash
      await session.update({ flash: undefined });
    }

    return {
      user: session.data.user,
      flash: flashMessage,
    };
  }),
  setFlash: publicProcedure.input(z.string()).query(async ({ input }) => {
    const session = await useServerSession();
    await session.update({
      flash: input,
    });
    return {
      success: true,
    };
  }),
} satisfies TRPCRouterRecord;
