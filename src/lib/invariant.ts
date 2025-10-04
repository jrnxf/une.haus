import { notFound } from "@tanstack/react-router";

export function invariant(
  condition: unknown,
  message?: string,
): asserts condition {
  if (!condition) {
    throw new Error(message ?? "Invariant failed");
  }
}

export function assertFound(condition: unknown): asserts condition {
  if (!condition) {
    throw notFound();
  }
}
