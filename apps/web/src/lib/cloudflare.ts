import Cloudflare from "cloudflare"

import { env } from "~/lib/env"

export const client = new Cloudflare({
  apiToken: env.CLOUDFLARE_IMAGES_EDITOR_API_TOKEN, // This is the default and can be omitted
})
