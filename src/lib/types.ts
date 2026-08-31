export type ServerFnData<T extends (args: { data: never }) => unknown> =
  Parameters<T>[0]["data"]

export type ServerFnReturn<T extends (args: { data: never }) => unknown> =
  Awaited<ReturnType<T>>
