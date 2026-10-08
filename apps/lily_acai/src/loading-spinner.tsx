import { useEffect, useState } from "react";

type LilyLoadingSpinnerProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

export function LilyLoadingSpinner({
  label = "Aguarde um instante",
  size = "md"
}: LilyLoadingSpinnerProps) {
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setPulse((value) => (value + 1) % 3), 850);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <span className={`lily-loading-spinner lily-loading-spinner--${size}`} role="status" aria-label={label}>
      <span className="lily-loading-spinner-orbit" aria-hidden="true">
        <span className="lily-loading-spinner-petal petal-a" />
        <span className="lily-loading-spinner-petal petal-b" />
        <span className="lily-loading-spinner-petal petal-c" />
        <span className={`lily-loading-spinner-core pulse-${pulse}`} />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
