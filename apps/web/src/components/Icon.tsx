import type { ReactElement } from "react";

type IconKind = "arrow" | "github" | "chevron";

export function Icon({
  kind = "arrow",
  className = "",
}: {
  kind?: IconKind;
  className?: string;
}): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
    >
      {kind === "arrow" && <path d="M5 19 19 5M5 5h14v14" />}
      {kind === "chevron" && <path d="m9 5 7 7-7 7" />}
      {kind === "github" && (
        <path
          fill="currentColor"
          stroke="none"
          d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.7-1.48-2.47-.28-5.06-1.24-5.06-5.49 0-1.21.44-2.2 1.14-2.97-.11-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.13a10.6 10.6 0 0 1 5.55 0c2.12-1.43 3.05-1.13 3.05-1.13.61 1.53.22 2.66.11 2.94.71.77 1.14 1.76 1.14 2.97 0 4.26-2.59 5.2-5.07 5.48.4.35.75 1.02.75 2.06v3.04c0 .3.2.65.76.54A11.1 11.1 0 0 0 12 .9Z"
        />
      )}
    </svg>
  );
}
