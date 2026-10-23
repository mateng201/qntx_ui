import { brandMarkPath } from "@qntx-ui/content";
import type { ReactElement } from "react";

export function BrandMark({ className = "" }: { className?: string }): ReactElement {
  return (
    <svg
      className={className}
      viewBox="-150 -150 300 300"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      fill="currentColor"
    >
      <path fillRule="evenodd" d={brandMarkPath} />
    </svg>
  );
}
