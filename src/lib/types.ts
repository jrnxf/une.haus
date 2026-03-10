import { type SkipToken } from "@tanstack/react-query"

export type ServerFnData<T extends (args: { data: never }) => unknown> =
  Parameters<T>[0]["data"]

export type ServerFnReturn<T extends (args: { data: never }) => unknown> =
  Awaited<ReturnType<T>>

export type Skippable<T> = T | SkipToken
