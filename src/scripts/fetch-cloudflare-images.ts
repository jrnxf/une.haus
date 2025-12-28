import { writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const BASE_DIR = join(homedir(), "skrrrt");
const TO_REUPLOAD_DIR = join(BASE_DIR, "to_reupload");
const CLOUDFLARE_MAPPINGS_FILE = join(
  TO_REUPLOAD_DIR,
  "cloudflare-mappings.json",
);

// Get credentials from environment variables
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_EMAIL = process.env.CLOUDFLARE_EMAIL;
const CLOUDFLARE_ACCOUNT_HASH = process.env.CLOUDFLARE_ACCOUNT_HASH; // e.g., -HCgnZBcmFH51trvA-5j4Q

// Validate we have the required credentials
const hasApiToken = CLOUDFLARE_API_TOKEN;
const hasGlobalKey = CLOUDFLARE_API_KEY && CLOUDFLARE_EMAIL;

if (!CLOUDFLARE_ACCOUNT_ID) {
  console.error(
    "❌ Missing required environment variable: CLOUDFLARE_ACCOUNT_ID",
  );
  console.error("\nGet your Account ID from: https://dash.cloudflare.com/");
  throw new Error("Missing CLOUDFLARE_ACCOUNT_ID");
}

if (!hasApiToken && !hasGlobalKey) {
  console.error(
    "❌ Missing authentication credentials. Use either:",
    "\n\nOption 1: API Token (recommended)",
    "\n  export CLOUDFLARE_ACCOUNT_ID=your_account_id",
    "\n  export CLOUDFLARE_API_TOKEN=your_api_token",
    "\n\n  Create token at: https://dash.cloudflare.com/profile/api-tokens",
    "  Required permissions: Account > Cloudflare Images > Read",
    "\n\nOption 2: Global API Key",
    "\n  export CLOUDFLARE_ACCOUNT_ID=your_account_id",
    "\n  export CLOUDFLARE_API_KEY=your_global_api_key",
    "\n  export CLOUDFLARE_EMAIL=your_email",
    "\n\n  Get from: https://dash.cloudflare.com/profile/api-tokens",
    "\n\nOptional:",
    "\n  export CLOUDFLARE_ACCOUNT_HASH=your_account_hash (for URL generation)",
  );
  throw new Error("Missing Cloudflare authentication credentials");
}

interface CloudflareImage {
  id: string;
  filename: string;
  uploaded: string;
  requireSignedURLs: boolean;
  variants: string[];
  metadata?: Record<string, unknown>;
}

interface CloudflareImagesResponse {
  success: boolean;
  errors: unknown[];
  messages: unknown[];
  result: {
    images: CloudflareImage[];
    continuation_token?: string;
  };
}

async function fetchAllCloudflareImages(): Promise<CloudflareImage[]> {
  const allImages: CloudflareImage[] = [];
  let continuationToken: string | undefined;

  console.log("Fetching images from Cloudflare Images API...\n");

  do {
    const url = new URL(
      `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/images/v1`,
    );

    if (continuationToken) {
      url.searchParams.set("continuation_token", continuationToken);
    }

    // Build headers based on available auth method
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (hasApiToken) {
      headers.Authorization = `Bearer ${CLOUDFLARE_API_TOKEN}`;
    } else if (hasGlobalKey) {
      headers["X-Auth-Email"] = CLOUDFLARE_EMAIL!;
      headers["X-Auth-Key"] = CLOUDFLARE_API_KEY!;
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Cloudflare API error: ${response.status} ${response.statusText}\n${errorText}`;

      // Provide helpful error messages
      if (response.status === 401 || response.status === 403) {
        errorMessage +=
          "\n\n💡 Authentication failed. Check:" +
          "\n  - API Token has 'Cloudflare Images:Read' permission" +
          "\n  - Account ID is correct" +
          "\n  - API Token/Key is not expired or revoked";
      }

      throw new Error(errorMessage);
    }

    const data = (await response.json()) as CloudflareImagesResponse;

    if (!data.success) {
      const errorDetails = JSON.stringify(data.errors, null, 2);
      throw new Error(
        `Cloudflare API returned errors:\n${errorDetails}\n\n💡 Check that your API token has 'Cloudflare Images:Read' permission.`,
      );
    }

    allImages.push(...data.result.images);
    continuationToken = data.result.continuation_token;

    console.log(`  Fetched ${allImages.length} images so far...`);

    // Small delay to avoid rate limiting
    if (continuationToken) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  } while (continuationToken);

  return allImages;
}

function generateImageUrl(imageId: string, variant = "public"): string {
  if (CLOUDFLARE_ACCOUNT_HASH) {
    // Custom domain format: https://une.haus/cdn-cgi/imagedelivery/{hash}/{id}/{variant}
    return `https://une.haus/cdn-cgi/imagedelivery/${CLOUDFLARE_ACCOUNT_HASH}/${imageId}/${variant}`;
  }
  // Default format: https://imagedelivery.net/{hash}/{id}/{variant}
  // Note: Without account hash, we can't generate the full URL
  return `https://imagedelivery.net/{account_hash}/${imageId}/${variant}`;
}

async function main() {
  try {
    const images = await fetchAllCloudflareImages();

    console.log(`\n✅ Found ${images.length} total images\n`);

    // Create mappings: image URL -> image ID
    const mappings: {
      imageId: string;
      filename: string;
      uploaded: string;
      url: string;
      variants: string[];
    }[] = [];

    for (const image of images) {
      // Generate URL for the public variant (or first variant if available)
      const variant = image.variants[0] || "public";
      const url = CLOUDFLARE_ACCOUNT_HASH
        ? generateImageUrl(image.id, variant)
        : `https://imagedelivery.net/{account_hash}/${image.id}/${variant}`;

      mappings.push({
        imageId: image.id,
        filename: image.filename,
        uploaded: image.uploaded,
        url,
        variants: image.variants,
      });
    }

    // Write mappings to file
    await writeFile(
      CLOUDFLARE_MAPPINGS_FILE,
      JSON.stringify(mappings, null, 2),
      "utf8",
    );

    console.log(
      `✅ Written ${mappings.length} mappings to: ${CLOUDFLARE_MAPPINGS_FILE}`,
    );
    console.log("\nSample mapping:");
    if (mappings[0]) {
      console.log(JSON.stringify(mappings[0], null, 2));
    }
  } catch (error) {
    console.error(
      "\n❌ Error:",
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

await main();
