import { useEffect, useState } from "react";

import { formatDistanceToNowStrict } from "date-fns";

const EVERY_10_SECONDS = 1000 * 10;
const EVERY_MINUTE = 1000 * 60;

export function TimeAgo({ date }: { date: Date }) {
  const [text, setText] = useState(
    formatDistanceToNowStrict(date, { addSuffix: true }),
  );

  useEffect(() => {
    const waitTime = text.includes("second") ? EVERY_10_SECONDS : EVERY_MINUTE;

    const interval = setInterval(() => {
      setText(formatDistanceToNowStrict(date, { addSuffix: true }));
    }, waitTime);

    return () => clearInterval(interval);
  }, [date, text]);

  return text;
}
