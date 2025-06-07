import { type HTMLAttributes } from "react";

import { cn, isDefined } from "~/lib/utils";

export function FlagEmoji({
  className,
  location,
  ...rest
}: HTMLAttributes<HTMLParagraphElement> & {
  location: null | { countryCode: string };
}) {
  const emoji = location ? getFlagEmoji(location.countryCode) : null;

  if (!emoji) {
    return null;
  }

  return (
    <p {...rest} className={cn("leading-none", className)}>
      {emoji}
    </p>
  );
}

/**
 * @credit https://dev.to/jorik/country-code-to-flag-emoji-a21
 */
function getFlagEmoji(countryCode: string) {
  const codePoints = [...countryCode.toUpperCase()]
    .map((char) => {
      const codePoint = char.codePointAt(0);
      return codePoint ? 127_397 + codePoint : undefined;
    })
    .filter(isDefined);

  return codePoints.length === 2 ? String.fromCodePoint(...codePoints) : "";
}
