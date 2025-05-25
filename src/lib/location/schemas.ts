import { z } from "zod";

export const searchCitiesGoogleMapsSchema = z.object({
  query: z.string(),
});

export const placeGoogleMapsSchema = z.object({
  placeId: z.string(),
  placeName: z.string(),
});
