import { merge, react } from "@qntx/oxlint";

export default merge(react, {
  ignorePatterns: [
    "**/node_modules/**",
    "**/dist/**",
    "**/.astro/**",
    "**/.expo/**",
    "**/.nx/**",
    "**/android/**",
    "**/ios/**",
    "**/playwright-report/**",
    "**/test-results/**",
  ],
  rules: {
    "import/no-unassigned-import": ["error", { allow: ["**/*.css", "@expo/metro-runtime"] }],
  },
});
