import { useEffect, useState } from "react";

import { AnimatePresence, motion } from "framer-motion";

import { invariant } from "~/lib/invariant";

export function MatrixText({
  text,
  dropHeight,
}: {
  text: string;
  dropHeight: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div className="flex w-[68px] justify-center">
      {/* the randomness of this component means the server and client will never
      render the same thing – causing a hydration warning. So in the server
      render and first client render we use the sr-only class to hide the element
      but keep it around for SEO */}
      {mounted ? (
        <AnimatePresence mode="popLayout">
          {[...text].map((char, index) => (
            <motion.span
              animate={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: -dropHeight }}
              key={`${char}-${index}`}
              transition={{ delay: 0.035 * index, type: "spring" }}
            >
              <Char finalChar={char} idx={index} />
            </motion.span>
          ))}
        </AnimatePresence>
      ) : (
        <span className="sr-only">{text}</span>
      )}
    </div>
  );
}

const CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()" as const;

function Char({ finalChar, idx }: { finalChar: string; idx: number }) {
  const [currentChar, setCurrentChar] = useState(getRandomChar());
  const [iter, setIter] = useState(0);

  // How many iterations to run through before stopping. I mostly just played
  // around with what looked good and a number that played well with the
  // interval duration of 30ms below to end the animation when I was hoping
  const stop = iter === idx * 4 + 30;

  useEffect(() => {
    if (stop) return;

    const timeout = setTimeout(() => {
      setCurrentChar(getRandomChar());
      setIter(iter + 1);
    }, 10);

    return () => clearTimeout(timeout);
  }, [idx, iter, stop]);

  return stop ? finalChar : currentChar;
}

const getRandomChar = () => {
  const value = CHARS[Math.floor(Math.random() * CHARS.length)];

  invariant(value, `Failed to retrieve random value from ${CHARS}`);

  return value;
};
