import { constants } from "node:fs";
import { access, copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { customAlphabet } from "nanoid";

const IMAGES_FILE = "src/bak/images.md";
const BASE_DIR = path.join(homedir(), "skrrrt");
const TO_REUPLOAD_DIR = path.join(BASE_DIR, "to_reupload");
const MISSING_FILE = path.join(TO_REUPLOAD_DIR, "missing.txt");
const MAPPINGS_FILE = path.join(TO_REUPLOAD_DIR, "mappings.json");

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const generateId = customAlphabet(alphabet, 12);

// https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/db4f2581-963a-4297-3781-b5bb90df6100/width=200,flip=h,blur=40

async function verifyImages() {
  // Create to_reupload directory if it doesn't exist
  try {
    await mkdir(TO_REUPLOAD_DIR, { recursive: true });
    console.log(`Created directory: ${TO_REUPLOAD_DIR}\n`);
  } catch {
    // Directory might already exist, that's fine
  }

  const content = await readFile(IMAGES_FILE, "utf8");
  const lines = content.split("\n");

  const httpsLines = lines.filter((line) => line.trim().startsWith("https://"));

  console.log(`Found ${httpsLines.length} URLs to verify\n`);

  let found = 0;
  let missing = 0;
  const missingFiles: string[] = [];
  const mappings: { oldPath: string; newId: string; url: string }[] = [];

  for (const url of httpsLines) {
    try {
      // Extract path from URL
      // URLs can be:
      // - https://skrrrt.s3.amazonaws.com/media/...
      // - https://skrrrt.s3.us-east-1.amazonaws.com/media/...
      // - https://skrrrt.s3.us-east-1.amazonaws.com/v2/...
      const urlObj = new URL(url.trim());
      let pathname = urlObj.pathname;

      // Remove leading slash
      if (pathname.startsWith("/")) {
        pathname = pathname.slice(1);
      }

      // URL decode the path
      const decodedPath = decodeURIComponent(pathname);

      // Construct local file path
      const localPath = path.join(BASE_DIR, decodedPath);

      // Check if file exists
      let fileExists = false;
      try {
        await access(localPath, constants.F_OK);
        fileExists = true;
      } catch {
        fileExists = false;
      }

      if (fileExists) {
        // Generate nanoid for the file
        const fileExtension = path.extname(decodedPath);
        const newId = generateId();

        const newFileName = `${newId}${fileExtension}`;

        // Copy file to to_reupload directory with new nanoid name
        const destPath = path.join(TO_REUPLOAD_DIR, newFileName);

        // Copy the file
        await copyFile(localPath, destPath);

        // Store mapping: old path (relative to BASE_DIR) -> new nanoid
        mappings.push({
          oldPath: decodedPath,
          newId: newFileName,
          url: url.trim(),
        });

        found++;
        process.stdout.write(".");
      } else {
        missing++;
        missingFiles.push(url);
        console.log(`\n❌ Missing: ${localPath}`);
        console.log(`   URL: ${url}`);
      }
    } catch (error) {
      console.error(`\n⚠️  Error processing URL: ${url}`);
      console.error(
        `   ${error instanceof Error ? error.message : String(error)}`,
      );
      missing++;
      missingFiles.push(url);
    }
  }

  // Write mappings to mappings.json
  await writeFile(MAPPINGS_FILE, JSON.stringify(mappings, null, 2), "utf8");
  console.log(`\n✅ Written ${mappings.length} mappings to: ${MAPPINGS_FILE}`);

  // Write missing files to missing.txt
  if (missingFiles.length > 0) {
    const missingContent = missingFiles.join("\n") + "\n";
    await writeFile(MISSING_FILE, missingContent, "utf8");
    console.log(
      `\n✅ Written ${missingFiles.length} missing URLs to: ${MISSING_FILE}`,
    );
  } else {
    // Create empty file if no missing files
    await writeFile(MISSING_FILE, "", "utf8");
  }

  console.log(`\n\nSummary:`);
  console.log(`  Found and copied: ${found}`);
  console.log(`  Missing: ${missing}`);
  console.log(`  Total: ${httpsLines.length}`);
  console.log(`\n✅ Files copied to: ${TO_REUPLOAD_DIR}`);
  console.log(`✅ Mappings written to: ${MAPPINGS_FILE}`);
  if (missingFiles.length > 0) {
    console.log(`✅ Missing files written to: ${MISSING_FILE}`);
  }
}

await verifyImages();
