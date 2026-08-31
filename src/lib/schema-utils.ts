import { z } from "zod"

/** Parses comma-separated string or array into a validated enum array */
export const commaArrayOf = <T extends string>(
  enumValues: readonly [T, ...T[]],
) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((val) => {
      if (!val) return undefined
      const arr = typeof val === "string" ? val.split(",").filter(Boolean) : val
      // Validate against enum
      const parsed = z.array(z.enum(enumValues)).safeParse(arr)
      return parsed.success ? parsed.data : undefined
    })
