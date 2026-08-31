import {
  placeGoogleMapsServerFn,
  searchCitiesGoogleMapsServerFn,
} from "~/lib/location/fns"
import {
  placeGoogleMapsSchema,
  searchCitiesGoogleMapsSchema,
} from "~/lib/location/schemas"

export const location = {
  searchCities: {
    fn: searchCitiesGoogleMapsServerFn,
    schema: searchCitiesGoogleMapsSchema,
  },
  place: {
    fn: placeGoogleMapsServerFn,
    schema: placeGoogleMapsSchema,
  },
}
