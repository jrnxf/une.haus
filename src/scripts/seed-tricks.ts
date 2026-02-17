import { readFile } from "node:fs/promises";
import path from "node:path";

import { parse } from "csv-parse/sync";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../db/schema";

const {
  tricks,
  trickElements,
  trickElementAssignments,
  trickRelationships,
} = schema;

// ---------- CONFIG ----------

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");

const client = postgres(DATABASE_URL);
const db = drizzle(client, { schema });

// ---------- HELPERS ----------

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseYear(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const match = raw.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : null;
}

function parseAlternateNames(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseCategories(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// ---------- CSV TYPES ----------

type CsvRow = {
  name: string;
  alternateNames: string[];
  categories: string[];
  definition: string | null;
  inventedBy: string | null;
  yearLanded: number | null;
  referenceVideoUrl: string | null;
  referenceVideoTimestamp: string | null;
  prerequisiteName: string | null;
  optionalPrerequisiteName: string | null;
  notes: string | null;
};

// ---------- ELEMENT DEFINITIONS ----------

const ALL_ELEMENTS: { slug: string; name: string; sortOrder: number }[] = [
  { slug: "spin", name: "spin", sortOrder: 0 },
  { slug: "flip", name: "flip", sortOrder: 1 },
  { slug: "wrap", name: "wrap", sortOrder: 2 },
  { slug: "twist", name: "twist", sortOrder: 3 },
  { slug: "roll", name: "roll", sortOrder: 4 },
  { slug: "grind", name: "grind", sortOrder: 5 },
  { slug: "varial", name: "varial", sortOrder: 6 },
  { slug: "coast", name: "coast", sortOrder: 7 },
  { slug: "walk", name: "walk", sortOrder: 8 },
  { slug: "rev", name: "rev", sortOrder: 9 },
  { slug: "mount", name: "mount", sortOrder: 10 },
  { slug: "basic", name: "basic", sortOrder: 11 },
  { slug: "wild", name: "wild", sortOrder: 12 },
  { slug: "whip", name: "whip", sortOrder: 13 },
  { slug: "jam", name: "jam", sortOrder: 14 },
  { slug: "grab", name: "grab", sortOrder: 15 },
  { slug: "glide", name: "glide", sortOrder: 16 },
  { slug: "balance", name: "balance", sortOrder: 17 },
  { slug: "ride", name: "ride", sortOrder: 18 },
  { slug: "handstepover", name: "handstepover", sortOrder: 19 },
  { slug: "stepover", name: "stepover", sortOrder: 20 },
  { slug: "plant", name: "plant", sortOrder: 21 },
  { slug: "combo", name: "combo", sortOrder: 22 },
  { slug: "position", name: "position", sortOrder: 23 },
  { slug: "pirouette", name: "pirouette", sortOrder: 24 },
  { slug: "footjam", name: "footjam", sortOrder: 25 },
  { slug: "crownjam", name: "crownjam", sortOrder: 26 },
  { slug: "toetwist", name: "toetwist", sortOrder: 27 },
  { slug: "pedal-push", name: "pedal push", sortOrder: 28 },
  { slug: "bc-wheel", name: "bc wheel", sortOrder: 29 },
  { slug: "prefix", name: "prefix", sortOrder: 30 },
];

// ---------- MAIN ----------

async function main() {
  console.log("=== Tricks CSV Import ===\n");

  // 1. Parse CSV
  const csvPath = path.resolve(import.meta.dirname!, "../../tricks.csv");
  const csvContent = await readFile(csvPath, "utf-8");

  const records = parse(csvContent, {
    columns: [
      "trickName",
      "alternateNames",
      "categories",
      "definition",
      "inventedBy",
      "yearLanded",
      "referenceVideoUrl",
      "referenceVideoTimestamp",
      "prerequisiteTrick",
      "optionalPrerequisiteTrick",
      "enteredBy",
      "notes",
    ],
    from_line: 2, // skip header
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Record<string, string>[];

  const csvRows: CsvRow[] = records
    .filter((r) => r.trickName?.trim())
    .map((r) => ({
      name: r.trickName.trim(),
      alternateNames: parseAlternateNames(r.alternateNames),
      categories: parseCategories(r.categories),
      definition: r.definition?.trim() || null,
      inventedBy: r.inventedBy?.trim() || null,
      yearLanded: parseYear(r.yearLanded),
      referenceVideoUrl: r.referenceVideoUrl?.trim() || null,
      referenceVideoTimestamp: r.referenceVideoTimestamp?.trim() || null,
      prerequisiteName: r.prerequisiteTrick?.trim() || null,
      optionalPrerequisiteName: r.optionalPrerequisiteTrick?.trim() || null,
      notes: r.notes?.trim() || null,
    }));

  console.log(`Parsed ${csvRows.length} tricks from CSV`);

  // 2. Rename element "side" → "wrap" if it exists
  const existingSide = await db
    .select()
    .from(trickElements)
    .where(eq(trickElements.slug, "side"));

  if (existingSide.length > 0) {
    console.log('Renaming element "side" → "wrap"');
    await db
      .update(trickElements)
      .set({ slug: "wrap", name: "wrap" })
      .where(eq(trickElements.slug, "side"));
  }

  // 3. Ensure all elements exist
  const existingElements = await db.select().from(trickElements);
  const existingElementSlugs = new Set(existingElements.map((e) => e.slug));

  const newElements = ALL_ELEMENTS.filter(
    (e) => !existingElementSlugs.has(e.slug),
  );

  if (newElements.length > 0) {
    console.log(`Inserting ${newElements.length} new elements`);
    await db.insert(trickElements).values(newElements);
  }

  // Refresh element lookup
  const allElements = await db.select().from(trickElements);
  const elementBySlug = new Map(allElements.map((e) => [e.slug, e.id]));
  console.log(`Total elements: ${allElements.length}`);

  // 4. Build slug → name lookup for prerequisite resolution
  const slugToName = new Map<string, string>();
  const nameToSlug = new Map<string, string>();
  for (const row of csvRows) {
    const slug = toSlug(row.name);
    slugToName.set(slug, row.name);
    nameToSlug.set(row.name.toLowerCase(), slug);
    for (const alt of row.alternateNames) {
      nameToSlug.set(alt.toLowerCase(), slug);
    }
  }

  // 5. Fetch existing tricks
  const existingTricks = await db
    .select({ id: tricks.id, slug: tricks.slug })
    .from(tricks);
  const existingTrickSlugs = new Map(
    existingTricks.map((t) => [t.slug, t.id]),
  );
  console.log(`Existing tricks in DB: ${existingTricks.length}`);

  // 6. First pass: upsert all tricks
  let inserted = 0;
  let updated = 0;
  const slugToDbId = new Map<string, number>();

  for (const row of csvRows) {
    const slug = toSlug(row.name);
    const isPrefix =
      row.categories.length === 1 && row.categories[0] === "prefix";

    const existingId = existingTrickSlugs.get(slug);

    if (existingId) {
      // Update existing trick with richer data
      await db
        .update(tricks)
        .set({
          name: row.name, // Update from kebab-case to proper display name
          alternateNames: row.alternateNames.length > 0 ? row.alternateNames : undefined,
          definition: row.definition ?? undefined,
          inventedBy: row.inventedBy ?? undefined,
          yearLanded: row.yearLanded ?? undefined,
          notes: row.notes ?? undefined,
          isPrefix,
          referenceVideoUrl: row.referenceVideoUrl ?? undefined,
          referenceVideoTimestamp: row.referenceVideoTimestamp ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(tricks.id, existingId));

      slugToDbId.set(slug, existingId);
      updated++;
    } else {
      // Insert new trick
      const [newTrick] = await db
        .insert(tricks)
        .values({
          slug,
          name: row.name,
          alternateNames: row.alternateNames,
          definition: row.definition,
          inventedBy: row.inventedBy,
          yearLanded: row.yearLanded,
          notes: row.notes,
          isPrefix,
          isCompound: true, // bypass modifier unique constraint
          referenceVideoUrl: row.referenceVideoUrl,
          referenceVideoTimestamp: row.referenceVideoTimestamp,
        })
        .returning({ id: tricks.id });

      if (newTrick) {
        slugToDbId.set(slug, newTrick.id);
        inserted++;
      }
    }
  }

  console.log(`Tricks: ${inserted} inserted, ${updated} updated`);

  // 7. Update element assignments
  // Delete existing assignments for tricks we're updating, then re-insert
  const allTrickIds = [...slugToDbId.values()];

  if (allTrickIds.length > 0) {
    // Delete in batches to avoid parameter limits
    const batchSize = 500;
    for (let i = 0; i < allTrickIds.length; i += batchSize) {
      const batch = allTrickIds.slice(i, i + batchSize);
      for (const trickId of batch) {
        await db
          .delete(trickElementAssignments)
          .where(eq(trickElementAssignments.trickId, trickId));
      }
    }
  }

  // Insert element assignments
  let assignmentCount = 0;
  for (const row of csvRows) {
    const slug = toSlug(row.name);
    const trickId = slugToDbId.get(slug);
    if (!trickId) continue;

    const categorySlugs = row.categories.map((c) => {
      // Map "pedal push" → "pedal-push", "bc wheel" → "bc-wheel"
      if (c === "pedal push") return "pedal-push";
      if (c === "bc wheel") return "bc-wheel";
      return c;
    });

    const assignments = categorySlugs
      .map((catSlug) => {
        const elementId = elementBySlug.get(catSlug);
        if (!elementId) {
          console.warn(`  Warning: Unknown category "${catSlug}" for trick "${row.name}"`);
          return null;
        }
        return { trickId, elementId };
      })
      .filter(Boolean) as { trickId: number; elementId: number }[];

    if (assignments.length > 0) {
      await db
        .insert(trickElementAssignments)
        .values(assignments)
        .onConflictDoNothing();
      assignmentCount += assignments.length;
    }
  }

  console.log(`Element assignments: ${assignmentCount} created`);

  // 8. Second pass: resolve prerequisite relationships
  // Refresh trick slug → id map (includes any already-existing tricks not in CSV)
  const allDbTricks = await db
    .select({ id: tricks.id, slug: tricks.slug })
    .from(tricks);
  const fullSlugToDbId = new Map(allDbTricks.map((t) => [t.slug, t.id]));

  let prereqCount = 0;
  let optPrereqCount = 0;

  for (const row of csvRows) {
    const slug = toSlug(row.name);
    const sourceTrickId = fullSlugToDbId.get(slug);
    if (!sourceTrickId) continue;

    // Delete existing prerequisite/optional_prerequisite relationships for this trick
    await db
      .delete(trickRelationships)
      .where(
        and(
          eq(trickRelationships.sourceTrickId, sourceTrickId),
          eq(trickRelationships.type, "prerequisite"),
        ),
      );
    await db
      .delete(trickRelationships)
      .where(
        and(
          eq(trickRelationships.sourceTrickId, sourceTrickId),
          eq(trickRelationships.type, "optional_prerequisite"),
        ),
      );

    // Resolve prerequisite
    if (row.prerequisiteName) {
      // CSV may have comma-separated prerequisites; take the first one
      const prereqNames = row.prerequisiteName.split(",").map((s) => s.trim());
      for (const prereqName of prereqNames) {
        const prereqSlug =
          nameToSlug.get(prereqName.toLowerCase()) ?? toSlug(prereqName);
        const targetTrickId = fullSlugToDbId.get(prereqSlug);
        if (targetTrickId && targetTrickId !== sourceTrickId) {
          await db
            .insert(trickRelationships)
            .values({
              sourceTrickId,
              targetTrickId,
              type: "prerequisite",
            })
            .onConflictDoNothing();
          prereqCount++;
          break; // Only take the first valid prerequisite
        }
      }
    }

    // Resolve optional prerequisite
    if (row.optionalPrerequisiteName) {
      const optPrereqNames = row.optionalPrerequisiteName
        .split(",")
        .map((s) => s.trim());
      for (const optName of optPrereqNames) {
        const optSlug =
          nameToSlug.get(optName.toLowerCase()) ?? toSlug(optName);
        const targetTrickId = fullSlugToDbId.get(optSlug);
        if (targetTrickId && targetTrickId !== sourceTrickId) {
          await db
            .insert(trickRelationships)
            .values({
              sourceTrickId,
              targetTrickId,
              type: "optional_prerequisite",
            })
            .onConflictDoNothing();
          optPrereqCount++;
          break; // Only take the first valid optional prerequisite
        }
      }
    }
  }

  console.log(
    `Relationships: ${prereqCount} prerequisites, ${optPrereqCount} optional prerequisites`,
  );

  // 9. Summary
  const finalCount = await db.select({ id: tricks.id }).from(tricks);
  const finalElements = await db
    .select({ id: trickElementAssignments.trickId })
    .from(trickElementAssignments);
  const finalRels = await db
    .select({ id: trickRelationships.id })
    .from(trickRelationships);

  console.log("\n=== Final counts ===");
  console.log(`Tricks: ${finalCount.length}`);
  console.log(`Element assignments: ${finalElements.length}`);
  console.log(`Relationships: ${finalRels.length}`);

  await client.end();
  console.log("\nDone!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
