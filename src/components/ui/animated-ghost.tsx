import { useEffect, useState } from "react";

export function AnimatedGhost() {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const moveGhost = () => {
      setPosition({
        x: Math.sin(Date.now() / 1000) * 10,
        y: Math.cos(Date.now() / 1500) * 5,
      });
    };

    const interval = setInterval(moveGhost, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      className="inline-block text-2xl transition-transform duration-300 ease-in-out"
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
      }}
    >
      👻
    </span>
  );
}
