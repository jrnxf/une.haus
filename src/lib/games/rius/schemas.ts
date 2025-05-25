import { z } from "zod";

export const gameUploadSchema = z.object({
  uploadId: z.string().nullable(),
});

export const baseRiuSetSchema = z.object({
  description: z.string().optional(),
  name: z.string().min(1, { message: "Required" }),
});

export const createRiuSetSchema = baseRiuSetSchema.extend({
  videoUploadId: z.string().min(1, { message: "Required" }),
});

export type CreateRiuSetArgs = z.infer<typeof createRiuSetSchema>;

export const getRiuSetSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
});

export type GetRiuSetArgs = z.infer<typeof getRiuSetSchema>;

export const getRiuSubmissionSchema = z.object({
  riuSubmissionId: z.number().positive({ message: "Required" }),
});

export type GetRiuSubmissionArgs = z.infer<typeof getRiuSubmissionSchema>;

export const updateRiuSetSchema = baseRiuSetSchema.extend({
  riuSetId: z.number().positive({ message: "Required" }),
});

export type UpdateRiuSetArgs = z.infer<typeof updateRiuSetSchema>;

export const createRiuSubmissionSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
  videoUploadId: z.string().min(1, { message: "Required" }),
});

export type CreateRiuSubmissionArgs = z.infer<typeof createRiuSubmissionSchema>;

export const deleteRiuSetSchema = z.object({
  riuSetId: z.number().positive({ message: "Required" }),
});
