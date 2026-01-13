import { describe, it, expect } from "vitest";

import { nano } from "../nanoid";

describe("nano", () => {
  it("generates a string", () => {
    const id = nano();
    expect(typeof id).toBe("string");
  });

  it("generates a 12 character string", () => {
    const id = nano();
    expect(id).toHaveLength(12);
  });

  it("only contains lowercase alphanumeric characters", () => {
    const id = nano();
    expect(id).toMatch(/^[0-9a-z]+$/);
  });

  it("generates unique IDs", () => {
    const ids = new Set<string>();
    const count = 1000;

    for (let i = 0; i < count; i++) {
      ids.add(nano());
    }

    // All 1000 IDs should be unique
    expect(ids.size).toBe(count);
  });

  it("does not contain uppercase characters", () => {
    const ids = Array.from({ length: 100 }, () => nano());

    for (const id of ids) {
      expect(id).toBe(id.toLowerCase());
    }
  });

  it("does not contain special characters", () => {
    const ids = Array.from({ length: 100 }, () => nano());
    const specialChars = /[^0-9a-z]/;

    for (const id of ids) {
      expect(specialChars.test(id)).toBe(false);
    }
  });

  it("is URL-safe", () => {
    const ids = Array.from({ length: 100 }, () => nano());

    for (const id of ids) {
      // Should be encodable without changes
      expect(encodeURIComponent(id)).toBe(id);
    }
  });

  it("has reasonable entropy distribution", () => {
    // Generate many IDs and check character distribution
    const charCounts = new Map<string, number>();
    const sampleSize = 10_000;

    for (let i = 0; i < sampleSize; i++) {
      const id = nano();
      for (const char of id) {
        charCounts.set(char, (charCounts.get(char) || 0) + 1);
      }
    }

    // With 36 characters in alphabet and 12 chars per ID,
    // each character should appear roughly (sampleSize * 12) / 36 times
    const expectedPerChar = (sampleSize * 12) / 36;
    const tolerance = expectedPerChar * 0.3; // Allow 30% variance

    for (const [, count] of charCounts) {
      expect(count).toBeGreaterThan(expectedPerChar - tolerance);
      expect(count).toBeLessThan(expectedPerChar + tolerance);
    }
  });
});
