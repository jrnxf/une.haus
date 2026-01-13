import { describe, it, expect, vi } from "vitest";

import { invariant } from "../invariant";

// Mock the @tanstack/react-router module for assertFound
vi.mock("@tanstack/react-router", () => ({
  notFound: () => {
    const error = new Error("Not Found");
    (error as Error & { isNotFound: boolean }).isNotFound = true;
    return error;
  },
}));

describe("invariant", () => {
  it("does not throw when condition is truthy", () => {
    expect(() => invariant(true)).not.toThrow();
    expect(() => invariant(1)).not.toThrow();
    expect(() => invariant("hello")).not.toThrow();
    expect(() => invariant({})).not.toThrow();
    expect(() => invariant([])).not.toThrow();
  });

  it("throws when condition is false", () => {
    expect(() => invariant(false)).toThrow("Invariant failed");
  });

  it("throws when condition is null", () => {
    expect(() => invariant(null)).toThrow("Invariant failed");
  });

  it("throws when condition is undefined", () => {
    expect(() => invariant(undefined)).toThrow("Invariant failed");
  });

  it("throws when condition is 0", () => {
    expect(() => invariant(0)).toThrow("Invariant failed");
  });

  it("throws when condition is empty string", () => {
    expect(() => invariant("")).toThrow("Invariant failed");
  });

  it("throws with custom message", () => {
    expect(() => invariant(false, "Custom error message")).toThrow(
      "Custom error message"
    );
  });

  it("works as type assertion", () => {
    const value: string | null = "hello";
    invariant(value);
    // After invariant, TypeScript should know value is string
    const length: number = value.length;
    expect(length).toBe(5);
  });
});

describe("assertFound", () => {
  it("does not throw when condition is truthy", async () => {
    // Re-import to use mocked version
    const { assertFound } = await import("../invariant");
    expect(() => assertFound(true)).not.toThrow();
    expect(() => assertFound({})).not.toThrow();
  });

  it("throws notFound error when condition is falsy", async () => {
    const { assertFound } = await import("../invariant");
    expect(() => assertFound(null)).toThrow("Not Found");
    expect(() => assertFound(undefined)).toThrow("Not Found");
    expect(() => assertFound(false)).toThrow("Not Found");
  });
});
