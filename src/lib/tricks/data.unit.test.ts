import { describe, expect, it } from "vitest";

import { compareTrickNames, getTrickSortKey } from "./compute";

describe("getTrickSortKey", () => {
  describe("leading number extraction", () => {
    it("extracts leading number from trick name", () => {
      const result = getTrickSortKey("180 unispin");
      expect(result.leadingNumber).toBe(180);
    });

    it("extracts decimal leading number", () => {
      const result = getTrickSortKey("1.5 flip");
      expect(result.leadingNumber).toBe(1.5);
    });

    it("returns 0 when no leading number", () => {
      const result = getTrickSortKey("crankflip");
      expect(result.leadingNumber).toBe(0);
    });

    it("extracts 360 from trick name", () => {
      const result = getTrickSortKey("360 unispin");
      expect(result.leadingNumber).toBe(360);
    });
  });

  describe("base words extraction", () => {
    it("extracts base words after leading number", () => {
      const result = getTrickSortKey("180 unispin");
      expect(result.baseWords).toBe("unispin");
    });

    it("extracts base words when no leading number", () => {
      const result = getTrickSortKey("crankflip");
      // The algorithm uses word boundaries (\b), so "crank" in "crankflip"
      // is not detected as a separate word - it stays as "crankflip"
      expect(result.baseWords).toBe("crankflip");
    });

    it("extracts base words removing progression word", () => {
      const result = getTrickSortKey("double flip");
      expect(result.baseWords).toBe("flip");
    });
  });

  describe("progression rank", () => {
    it("identifies half progression", () => {
      const result = getTrickSortKey("half flip");
      expect(result.progressionRank).toBe(0);
    });

    it("identifies crank progression with space", () => {
      // The algorithm requires word boundaries, so "crank flip" works but "crankflip" doesn't
      const result = getTrickSortKey("crank flip");
      expect(result.progressionRank).toBe(1);
    });

    it("compound word crankflip has base progression rank", () => {
      // "crankflip" as a compound word doesn't match the \b boundary pattern
      const result = getTrickSortKey("crankflip");
      expect(result.progressionRank).toBe(3); // Index of empty string (base)
    });

    it("identifies single progression", () => {
      const result = getTrickSortKey("single flip");
      expect(result.progressionRank).toBe(2);
    });

    it("identifies double progression with space", () => {
      const result = getTrickSortKey("double flip");
      expect(result.progressionRank).toBe(5);
    });

    it("compound doubleflip has base progression rank", () => {
      // Compound words don't match word boundaries
      const result = getTrickSortKey("doubleflip");
      expect(result.progressionRank).toBe(3);
    });

    it("identifies triple progression with space", () => {
      const result = getTrickSortKey("triple flip");
      expect(result.progressionRank).toBe(7);
    });

    it("compound tripleflip has base progression rank", () => {
      const result = getTrickSortKey("tripleflip");
      expect(result.progressionRank).toBe(3);
    });

    it("identifies quad progression", () => {
      const result = getTrickSortKey("quad flip");
      expect(result.progressionRank).toBe(9);
    });

    it("returns base rank for no progression word", () => {
      const result = getTrickSortKey("unispin");
      expect(result.progressionRank).toBe(3); // Index of empty string
    });
  });

  describe("suffix extraction", () => {
    it("extracts trailing number as suffix", () => {
      const result = getTrickSortKey("flip variation 2");
      expect(result.suffix).toBe("2");
    });

    it("returns empty string when no trailing number", () => {
      const result = getTrickSortKey("crankflip");
      expect(result.suffix).toBe("");
    });
  });
});

describe("compareTrickNames", () => {
  describe("base words grouping", () => {
    it("groups by base word - flip before unispin", () => {
      const result = compareTrickNames("flip", "unispin");
      expect(result).toBeLessThan(0);
    });

    it("groups by base word - same base words equal", () => {
      const result = compareTrickNames("flip", "double flip");
      // Both should have "flip" as base, but double has higher progression
      // First they compare base words (both "flip"), so they're equal there
      // Then progression rank matters
      expect(result).toBeLessThan(0); // flip (base) < double flip
    });
  });

  describe("leading number ordering", () => {
    it("orders by leading number within same base", () => {
      expect(compareTrickNames("90 unispin", "180 unispin")).toBeLessThan(0);
      expect(compareTrickNames("180 unispin", "270 unispin")).toBeLessThan(0);
      expect(compareTrickNames("270 unispin", "360 unispin")).toBeLessThan(0);
    });

    it("180 comes before 360", () => {
      const result = compareTrickNames("180 unispin", "360 unispin");
      expect(result).toBeLessThan(0);
    });
  });

  describe("progression ordering", () => {
    it("orders progressions correctly with spaces: flip < double flip < triple flip", () => {
      expect(compareTrickNames("flip", "double flip")).toBeLessThan(0);
      expect(compareTrickNames("double flip", "triple flip")).toBeLessThan(0);
    });

    it("compound words are compared alphabetically since progression not detected", () => {
      // "doubleflip" < "flip" alphabetically because 'd' < 'f'
      expect(compareTrickNames("doubleflip", "flip")).toBeLessThan(0);
    });

    it("half flip comes before crank flip", () => {
      const result = compareTrickNames("half flip", "crank flip");
      expect(result).toBeLessThan(0);
    });

    it("crank flip comes before single flip", () => {
      const result = compareTrickNames("crank flip", "single flip");
      expect(result).toBeLessThan(0);
    });

    it("1.5 comes after single", () => {
      const result = compareTrickNames("1.5 flip", "single flip");
      // 1.5 has leading number 1.5, single has leading number 0
      // But base words: "flip" vs "flip" - equal
      // Leading number: 1.5 vs 0 - 1.5 > 0
      expect(result).toBeGreaterThan(0);
    });
  });

  describe("complex sorting scenarios", () => {
    it("sorts mixed tricks correctly", () => {
      const tricks = [
        "360 unispin",
        "180 unispin",
        "tripleflip",
        "crankflip",
        "90 unispin",
        "doubleflip",
      ];

      const sorted = [...tricks].sort(compareTrickNames);

      // Flips should come first (f < u), then unispins
      // Within flips: crank < double < triple
      // Within unispins: 90 < 180 < 360
      expect(sorted.indexOf("crankflip")).toBeLessThan(
        sorted.indexOf("doubleflip"),
      );
      expect(sorted.indexOf("doubleflip")).toBeLessThan(
        sorted.indexOf("tripleflip"),
      );
      expect(sorted.indexOf("90 unispin")).toBeLessThan(
        sorted.indexOf("180 unispin"),
      );
      expect(sorted.indexOf("180 unispin")).toBeLessThan(
        sorted.indexOf("360 unispin"),
      );
    });

    it("handles lowercase vs uppercase consistently", () => {
      // getTrickSortKey converts to lowercase
      const result = compareTrickNames("Flip", "FLIP");
      expect(result).toBe(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty string", () => {
      const result = getTrickSortKey("");
      expect(result.leadingNumber).toBe(0);
      expect(result.baseWords).toBe("");
    });

    it("handles string with only number", () => {
      const result = getTrickSortKey("180");
      expect(result.leadingNumber).toBe(180);
      expect(result.baseWords).toBe("");
    });

    it("handles string with spaces", () => {
      const result = getTrickSortKey("  180   unispin  ");
      expect(result.leadingNumber).toBe(0); // Leading spaces break the regex
    });
  });
});

describe("sorting stability", () => {
  it("maintains consistent order for equal items", () => {
    const result1 = compareTrickNames("flip", "flip");
    const result2 = compareTrickNames("flip", "flip");
    expect(result1).toBe(0);
    expect(result2).toBe(0);
  });

  it("is transitive: if a < b and b < c then a < c", () => {
    const a = "crankflip";
    const b = "doubleflip";
    const c = "tripleflip";

    expect(compareTrickNames(a, b)).toBeLessThan(0);
    expect(compareTrickNames(b, c)).toBeLessThan(0);
    expect(compareTrickNames(a, c)).toBeLessThan(0);
  });

  it("is antisymmetric: if a < b then b > a", () => {
    const a = "90 unispin";
    const b = "180 unispin";

    expect(compareTrickNames(a, b)).toBeLessThan(0);
    expect(compareTrickNames(b, a)).toBeGreaterThan(0);
  });
});
