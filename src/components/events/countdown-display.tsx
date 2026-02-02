import { cn } from "~/lib/utils";

const pad = (n: number) => n.toString().padStart(2, "0");

export function formatCountdownTime(ms: number, maxSeconds: number, isRunning: boolean) {
  // When running, show floor (time decrements immediately on start)
  // When idle/paused, show ceiling (shows full initial time)
  const totalSeconds = isRunning
    ? Math.max(0, Math.ceil(ms / 1000) - 1)
    : Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  // If max time is 60 seconds or less, show just seconds
  if (maxSeconds <= 60) {
    return totalSeconds.toString();
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

type CountdownDisplayProps = {
  timeRemaining: number;
  maxSeconds: number;
  isRunning: boolean;
  isFinished: boolean;
  className?: string;
};

export function CountdownDisplay({
  timeRemaining,
  maxSeconds,
  isRunning,
  isFinished,
  className,
}: CountdownDisplayProps) {
  const isLow = timeRemaining <= 10_000 && isRunning;

  return (
    <div
      className={cn(
        "font-mono font-bold leading-none tabular-nums transition-colors",
        isFinished && "text-destructive",
        isLow && !isFinished && "text-yellow-500",
        className,
      )}
    >
      {formatCountdownTime(timeRemaining, maxSeconds, isRunning)}
    </div>
  );
}
