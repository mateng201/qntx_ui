import { fmt } from "@qntx/oxfmt";

export default {
  ...fmt,
  ignorePatterns: [
    ...(fmt.ignorePatterns ?? []),
    "**/*.astro",
    "**/.astro/**",
    "**/.expo/**",
    "**/.nx/**",
    "**/android/**",
    "**/ios/**",
    "**/playwright-report/**",
    "**/test-results/**",
    "package-lock.json",
    "Q1.md",
  ],
};
