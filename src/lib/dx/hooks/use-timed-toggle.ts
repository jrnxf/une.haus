import { useEffect, useState } from "react"

export function useTimedToggle(ms: number) {
  const [on, setOn] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setOn((on) => !on)
    }, ms)

    return () => clearInterval(interval)
  }, [ms])

  return on
}
