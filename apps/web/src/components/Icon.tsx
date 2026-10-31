import type { ReactElement } from "react";

import { githubIconPath } from "../data/site";

type IconKind = "arrow" | "github";

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
      {kind === "github" && <path fill="currentColor" stroke="none" d={githubIconPath} />}
    </svg>
  );
}
