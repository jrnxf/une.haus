import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  cn,
  errorFmt,
  getCloudflareImageUrl,
  getUserInitials,
  isDefined,
  preferCdn,
  preprocessText,
  zodErrorFmt,
} from "../utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const condition = false;
    expect(cn("foo", condition && "bar", "baz")).toBe("foo baz");
  });

  it("deduplicates tailwind classes", () => {
    expect(cn("p-4", "p-2")).toBe("p-2");
  });

  it("handles arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });

  it("handles empty inputs", () => {
    expect(cn()).toBe("");
  });

  it("handles undefined and null", () => {
    expect(cn("foo", undefined, null, "bar")).toBe("foo bar");
  });
});

describe("zodErrorFmt", () => {
  it("formats single validation error", () => {
    const schema = z.object({ name: z.string() });
    const result = schema.safeParse({ name: 123 });
    if (!result.success) {
      const formatted = zodErrorFmt(result.error);
      expect(formatted).toContain("Validation error:");
      // Zod v4 uses "Invalid input" for type mismatches
      expect(formatted).toMatch(/Invalid input|Expected string/);
    }
  });

  it("formats multiple validation errors", () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    const result = schema.safeParse({ name: 123, age: "invalid" });
    if (!result.success) {
      const formatted = zodErrorFmt(result.error);
      expect(formatted).toContain("Validation errors:");
    }
  });
});

describe("errorFmt", () => {
  it("formats ZodError", () => {
    const schema = z.string();
    const result = schema.safeParse(123);
    if (!result.success) {
      const formatted = errorFmt(result.error);
      expect(formatted).toContain("Validation error");
    }
  });

  it("formats regular Error", () => {
    const error = new Error("Something went wrong");
    expect(errorFmt(error)).toBe("Something went wrong");
  });

  it("formats string errors", () => {
    expect(errorFmt("Simple error")).toBe("Simple error");
  });

  it("formats unknown types", () => {
    expect(errorFmt(42)).toBe("42");
    expect(errorFmt({ custom: "error" })).toBe("[object Object]");
  });
});

describe("preferCdn", () => {
  it("replaces origin with CloudFront CDN", () => {
    const url = "https://example.com/path/to/image.jpg";
    expect(preferCdn(url)).toBe(
      "https://d21ywshxutk0x0.cloudfront.net/path/to/image.jpg",
    );
  });

  it("handles URLs with ports (port is removed by URL.origin)", () => {
    // Note: URL.origin includes the port only for non-standard ports,
    // but the replacement only affects the origin portion
    const url = "https://example.com:8080/image.jpg";
    // The actual behavior: origin includes port, so port is replaced too
    expect(preferCdn(url)).toBe(
      "https://d21ywshxutk0x0.cloudfront.net/image.jpg",
    );
  });

  it("returns empty string for null", () => {
    expect(preferCdn(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(preferCdn(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(preferCdn("")).toBe("");
  });
});

describe("getUserInitials", () => {
  it("extracts initials from two-word name", () => {
    expect(getUserInitials("John Doe")).toEqual(["J", "D"]);
  });

  it("handles single word name", () => {
    expect(getUserInitials("John")).toEqual(["J"]);
  });

  it("limits to first two words", () => {
    expect(getUserInitials("John Michael Doe")).toEqual(["J", "M"]);
  });

  it("handles lowercase names", () => {
    expect(getUserInitials("john doe")).toEqual(["j", "d"]);
  });

  it("handles empty string", () => {
    expect(getUserInitials("")).toEqual([""]);
  });
});

describe("preprocessText", () => {
  it("trims whitespace", () => {
    expect(preprocessText("  hello world  ")).toBe("hello world");
  });

  it("reduces 3+ line breaks to 2", () => {
    expect(preprocessText("hello\n\n\nworld")).toBe("hello\n\nworld");
  });

  it("preserves single line breaks", () => {
    expect(preprocessText("hello\nworld")).toBe("hello\nworld");
  });

  it("preserves double line breaks", () => {
    expect(preprocessText("hello\n\nworld")).toBe("hello\n\nworld");
  });

  it("handles multiple instances of excessive line breaks", () => {
    expect(preprocessText("a\n\n\nb\n\n\n\nc")).toBe("a\n\nb\n\nc");
  });

  it("handles empty string", () => {
    expect(preprocessText("")).toBe("");
  });

  it("combines trimming with line break reduction", () => {
    expect(preprocessText("  hello\n\n\n\nworld  ")).toBe("hello\n\nworld");
  });
});

describe("isDefined", () => {
  it("returns true for defined values", () => {
    expect(isDefined("hello")).toBe(true);
    expect(isDefined(0)).toBe(true);
    expect(isDefined(false)).toBe(true);
    expect(isDefined("")).toBe(true);
    expect(isDefined([])).toBe(true);
    expect(isDefined({})).toBe(true);
  });

  it("returns false for null", () => {
    expect(isDefined(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isDefined(undefined)).toBe(false);
  });

  it("works as type guard in filter", () => {
    const arr: (string | null | undefined)[] = ["a", null, "b", undefined, "c"];
    const filtered = arr.filter(isDefined);
    expect(filtered).toEqual(["a", "b", "c"]);
    // TypeScript should infer filtered as string[]
  });
});

describe("getCloudflareImageUrl", () => {
  it("constructs correct URL with options", () => {
    const url = getCloudflareImageUrl("abc123", { width: 800, quality: 85 });
    expect(url).toBe(
      "https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/abc123/width=800,quality=85",
    );
  });

  it("handles different widths and qualities", () => {
    const url = getCloudflareImageUrl("test-id", { width: 1200, quality: 100 });
    expect(url).toBe(
      "https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/test-id/width=1200,quality=100",
    );
  });

  it("handles small values", () => {
    const url = getCloudflareImageUrl("id", { width: 1, quality: 1 });
    expect(url).toBe(
      "https://une.haus/cdn-cgi/imagedelivery/-HCgnZBcmFH51trvA-5j4Q/id/width=1,quality=1",
    );
  });
});
