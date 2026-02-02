import { cn } from "~/lib/utils";

const pad = (n: number) => n.toString().padStart(2, "0");

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
  const totalSeconds = Math.max(0, Math.floor(timeRemaining / 1000));
  const tenths = Math.floor((timeRemaining % 1000) / 100);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const mainDisplay =
    maxSeconds <= 60 ? totalSeconds.toString() : `${pad(minutes)}:${pad(seconds)}`;

  return (
    <div
      className={cn(
        "font-mono font-bold leading-none tabular-nums transition-colors",
        isFinished && "text-destructive",
        isLow && !isFinished && "text-yellow-500",
        className,
      )}
    >
      {mainDisplay}
      <span className="text-[0.25em] opacity-50">.{tenths}</span>
    </div>
  );
}
