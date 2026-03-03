import { cn } from "~/lib/utils"

export function Json({
  className,
  data,
  legend,
  stringify = true,
  ...properties
}: React.HTMLAttributes<HTMLFieldSetElement> & {
  // biome-ignore lint/suspicious/noExplicitAny: JSON value type
  data: any
  legend?: number | string
  stringify?: boolean
}) {
  return (
    <fieldset
      className={cn(
        "border-border mx-auto w-fit max-w-[80vw] overflow-auto rounded-md border-2 p-2 px-4",
        className,
      )}
      {...properties}
    >
      {legend && (
        <legend className="line-clamp-1 px-4 font-semibold">{legend}</legend>
      )}
      <pre className="whitespace-pre-wrap">
        {stringify ? JSON.stringify(data, null, 2) : data}
      </pre>
    </fieldset>
  )
}
