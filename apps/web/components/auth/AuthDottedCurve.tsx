interface AuthDottedCurveProps {
  className?: string;
}

export function AuthDottedCurve({ className }: AuthDottedCurveProps) {
  return (
    <svg
      viewBox="0 0 220 720"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M178 18 C 112 112, 154 222, 104 334 C 62 428, 120 538, 72 696"
        fill="none"
        stroke="rgba(116, 136, 166, 0.36)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1.8 10"
      />
    </svg>
  );
}
