import { readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

const BASE_DIR = path.join(homedir(), "skrrrt")
const TO_REUPLOAD_DIR = path.join(BASE_DIR, "to_reupload")
const MAPPINGS_FILE = path.join(TO_REUPLOAD_DIR, "mappings.json")
const CLOUDFLARE_MAPPINGS_FILE = path.join(
  TO_REUPLOAD_DIR,
  "cloudflare-mappings.json",
)
const META_MAPPINGS_FILE = path.join(TO_REUPLOAD_DIR, "meta-mappings.json")

interface LocalMapping {
  oldPath: string
  newId: string
  url: string
}

interface CloudflareMapping {
  imageId: string
  filename: string
  uploaded: string
  url: string
  variants: string[]
}

interface MetaMapping {
  // Original S3 data
  originalUrl: string
  originalPath: string
  // Local renamed file
  localFilename: string
  // Cloudflare data
  cloudflareImageId: string | null
  cloudflareUrl: string | null
  cloudflareUploaded: string | null
  cloudflareVariants: string[]
}

async function combineMappings() {
  console.log("Reading mappings files...\n")

  // Read local mappings
  const mappingsContent = await readFile(MAPPINGS_FILE, "utf8")
  const localMappings: LocalMapping[] = JSON.parse(mappingsContent)
  console.log(`  Found ${localMappings.length} local mappings`)

  // Read Cloudflare mappings
  const cfMappingsContent = await readFile(CLOUDFLARE_MAPPINGS_FILE, "utf8")
  const cfMappings: CloudflareMapping[] = JSON.parse(cfMappingsContent)
  console.log(`  Found ${cfMappings.length} Cloudflare mappings`)

  // Create a lookup map for Cloudflare mappings by filename
  const cfByFilename = new Map<string, CloudflareMapping>()
  for (const cf of cfMappings) {
    cfByFilename.set(cf.filename, cf)
  }

  // Combine mappings
  const metaMappings: MetaMapping[] = []
  let matched = 0
  let unmatched = 0

  for (const local of localMappings) {
    const cf = cfByFilename.get(local.newId)

    if (cf) {
      matched++
      metaMappings.push({
        originalUrl: local.url,
        originalPath: local.oldPath,
        localFilename: local.newId,
        cloudflareImageId: cf.imageId,
        cloudflareUrl: cf.url,
        cloudflareUploaded: cf.uploaded,
        cloudflareVariants: cf.variants,
      })
    } else {
      unmatched++
      metaMappings.push({
        originalUrl: local.url,
        originalPath: local.oldPath,
        localFilename: local.newId,
        cloudflareImageId: null,
        cloudflareUrl: null,
        cloudflareUploaded: null,
        cloudflareVariants: [],
      })
    }
  }

  // Write combined mappings
  await writeFile(
    META_MAPPINGS_FILE,
    JSON.stringify(metaMappings, null, 2),
    "utf8",
  )

  console.log(`\n✅ Combined ${metaMappings.length} mappings`)
  console.log(`  Matched with Cloudflare: ${matched}`)
  console.log(`  Not found in Cloudflare: ${unmatched}`)
  console.log(`\n✅ Written to: ${META_MAPPINGS_FILE}`)

  if (metaMappings[0]) {
    console.log("\nSample meta-mapping:")
    console.log(JSON.stringify(metaMappings[0], null, 2))
  }

  if (unmatched > 0) {
    console.log(
      `\n⚠️  ${unmatched} files not found in Cloudflare. These may not have been uploaded yet.`,
    )
  }
}

await combineMappings()
