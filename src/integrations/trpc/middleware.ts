import { type t } from "./init";
import colors from "yoctocolors";

type MiddlewareFn = Parameters<typeof t.procedure.use>[0];

export const timingMiddleware: MiddlewareFn = async (opts) => {
  const start = performance.now();

  const result = await opts.next();

  const durationMs = performance.now() - start;

  const source = colors.magenta(
    opts.ctx.req.headers.get("x-trpc-source") ?? "unknown",
  );

  opts.ctx.setCookie("x-trpc-sourcey", source);

  const path = colors.blue(`${opts.type}.${opts.path}`);

  const totalTime =
    durationMs > 1000
      ? colors.red(`${(durationMs / 1000).toFixed(2)}s`)
      : durationMs > 500
        ? colors.yellow(`${Math.round(durationMs)}ms`)
        : colors.green(`${Math.round(durationMs)}ms`);

  const message = ["trpc", source, path, totalTime].join(colors.gray("/"));

  if (result.ok) {
    console.log(message);
  } else {
    console.log(colors.bgRed(message));
  }

  return result;
};
