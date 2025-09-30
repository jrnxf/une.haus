import { createServerFn } from "@tanstack/react-start";

import {
  AddressType,
  PlaceAutocompleteType,
} from "@googlemaps/google-maps-services-js";

import { google } from "~/lib/clients/google";
import { env } from "~/lib/env";
import {
  placeGoogleMapsSchema,
  searchCitiesGoogleMapsSchema,
} from "~/lib/location/schemas";

export const searchCitiesGoogleMapsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(searchCitiesGoogleMapsSchema)
  .handler(async ({ data: input }) => {
    const { data } = await google.maps.placeAutocomplete({
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
  });

export const placeGoogleMapsServerFn = createServerFn({
  method: "POST",
})
  .inputValidator(placeGoogleMapsSchema)
  .handler(async ({ data: input }) => {
    const { data } = await google.maps.placeDetails({
      adapter: "fetch",
      params: {
        key: env.GOOGLE_API_KEY,
        place_id: input.placeId,
      },
      timeout: 3000,
    });

    const { address_components, geometry } = data.result;

    if (!geometry || !address_components) {
      throw new Error("Unable to determine geometry, or address_components");
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
      label: input.placeName,
      lat: geometry.location.lat,
      lng: geometry.location.lng,
    };
  });
