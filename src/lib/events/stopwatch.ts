import { z } from "zod";

import { decodeRider, encodeRider, type RiderEntry } from "./bracket";

export const stopwatchSearchSchema = z.object({
  rider: z.string().optional(),
  time: z.coerce.number().min(1).max(3600).optional().default(60),
});

export function parseRiderParam(
  param: string | undefined,
): RiderEntry | null {
  if (!param) return null;
  return decodeRider(param);
}

export function encodeRiderParam(
  rider: { userId: number | null; name: string | null } | null,
): string | undefined {
  if (!rider) return undefined;
  return encodeRider(rider) ?? undefined;
}
