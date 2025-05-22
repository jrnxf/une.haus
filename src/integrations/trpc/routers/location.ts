import {
  AddressType,
  PlaceAutocompleteType,
} from "@googlemaps/google-maps-services-js";
import { z } from "zod";

import { type TRPCRouterRecord } from "@trpc/server";
import { authProcedure } from "~/integrations/trpc/init";
import { env } from "~/lib/env";
import { googleClient } from "~/server/clients/google";

export const locationRouter = {
  cities: authProcedure
    .input(
      z.object({
        query: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = await googleClient.maps.placeAutocomplete({
        adapter: "fetch",
        params: {
          input: input.query,
          key: env.GOOGLE_API_KEY,
          types: PlaceAutocompleteType.cities,
        },
        timeout: 5000,
      });

      return data.predictions.map(({ description, place_id }) => ({
        description,
        placeId: place_id,
      }));
    }),

  place: authProcedure
    .input(
      z.object({
        placeId: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const { data } = await googleClient.maps.placeDetails({
        adapter: "fetch",
        params: {
          key: env.GOOGLE_API_KEY,
          place_id: input.placeId,
        },
        timeout: 3000,
      });

      const { address_components, formatted_address, geometry } = data.result;

      if (!geometry || !formatted_address || !address_components) {
        throw new Error(
          "Unable to determine geometry, formatted_address, or address_components",
        );
      }

      const country = address_components.find((address) =>
        address.types.includes(AddressType.country),
      );

      if (!country) {
        throw new Error("Unable to determine country");
      }

      return {
        countryCode: country.short_name,
        countryName: country.long_name,
        formattedAddress: formatted_address,
        lat: geometry.location.lat,
        lng: geometry.location.lng,
      };
    }),
} satisfies TRPCRouterRecord;
