export type ServerFnData<
  T extends (args: { data: Record<string, unknown> }) => unknown,
> = Parameters<T>[0]["data"];

export type ServerFnReturn<
  T extends (args: { data: Record<string, unknown> }) => unknown,
> = Awaited<ReturnType<T>>;
