import { useEffect, useState } from "react";

import { formatDistanceToNowStrict } from "date-fns";

const EVERY_10_SECONDS = 1000 * 10;
const EVERY_MINUTE = 1000 * 60;

export function TimeAgo({ date }: { date: Date }) {
  const [waitTime, setWaitTime] = useState(EVERY_MINUTE);
  const [text, setText] = useState(
    formatDistanceToNowStrict(date, { addSuffix: true }),
  );

  useEffect(() => {
    if (text.includes("second")) {
      // if we're still showing seconds, update every 10 seconds
      setWaitTime(EVERY_10_SECONDS);
    } else {
      // otherwise, update every minute
      setWaitTime(EVERY_MINUTE);
    }

    const interval = setInterval(() => {
      setText(formatDistanceToNowStrict(date, { addSuffix: true }));
    }, waitTime);

    return () => clearInterval(interval);
  }, [date, text, waitTime]);

  return text;
}
