type LilyLoadingSpinnerProps = {
  label?: string;
  size?: "sm" | "md" | "lg";
};

export function LilyLoadingSpinner({
  label = "Aguarde um instante",
  size = "md"
}: LilyLoadingSpinnerProps) {
  return (
    <span className={`lily-loading-spinner lily-loading-spinner--${size}`} role="status" aria-label={label}>
      <span className="lily-loading-spinner-orbit" aria-hidden="true">
        <span className="lily-loading-spinner-petal petal-a" />
        <span className="lily-loading-spinner-petal petal-b" />
        <span className="lily-loading-spinner-petal petal-c" />
        <span className="lily-loading-spinner-core" />
      </span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
