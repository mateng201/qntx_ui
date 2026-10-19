import { merge, react } from "@qntx/oxlint";

export default merge(react, {
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.astro/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ],
  rules: { "import/no-unassigned-import": ["error", { allow: ["**/*.css"] }] },
});
