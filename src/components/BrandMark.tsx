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
      <path
        fillRule="evenodd"
        d="M-67.7647 -135.5294L67.7647 -135.5294A67.7647 67.7647 0 0 1 135.5294 -67.7647L135.5294 67.7647A67.7647 67.7647 0 0 0 67.7647 135.5294L-67.7647 135.5294A67.7647 67.7647 0 0 1 -135.5294 67.7647L-135.5294 -67.7647A67.7647 67.7647 0 0 1 -67.7647 -135.5294ZM-45.1765 -45.1765L45.1765 -45.1765L45.1765 45.1765L-45.1765 45.1765Z"
      />
    </svg>
  );
}
