import nx from "@nx/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import * as astroParser from "astro-eslint-parser";

const boundaries = [
  "error",
  {
    enforceBuildableLibDependency: false,
    allow: [],
    depConstraints: [
      {
        sourceTag: "platform:web",
        onlyDependOnLibsWithTags: ["platform:web", "platform:shared"],
        bannedExternalImports: ["react-native", "react-native/**", "expo", "expo/**", "expo-*"],
      },
      {
        sourceTag: "platform:mobile",
        onlyDependOnLibsWithTags: ["platform:mobile", "platform:shared"],
        bannedExternalImports: ["astro", "astro/**", "@astrojs/*", "react-dom", "react-dom/**"],
      },
      {
        sourceTag: "platform:shared",
        onlyDependOnLibsWithTags: ["platform:shared"],
        bannedExternalImports: [
          "astro",
          "astro/**",
          "@astrojs/*",
          "react",
          "react/**",
          "react-dom",
          "react-dom/**",
          "react-native",
          "react-native/**",
          "expo",
          "expo/**",
          "expo-*",
        ],
      },
      { sourceTag: "type:lib", notDependOnLibsWithTags: ["type:app"] },
    ],
  },
];

// ESLint only enforces architecture. @qntx/oxlint remains the general code-quality preset.
const configuration = [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.astro/**",
      "**/.expo/**",
      "**/.nx/**",
      "**/test-results/**",
      "**/playwright-report/**",
    ],
  },
  {
    files: ["apps/**/*.{ts,tsx,js,jsx,mjs,cjs}", "packages/**/*.{ts,tsx,js,jsx,mjs,cjs}"],
    languageOptions: { parser: tsParser, parserOptions: { ecmaFeatures: { jsx: true } } },
    plugins: { "@nx": nx },
    rules: { "@nx/enforce-module-boundaries": boundaries },
  },
  {
    files: ["apps/web/**/*.astro"],
    languageOptions: { parser: astroParser, parserOptions: { parser: tsParser } },
    plugins: { "@nx": nx },
    rules: { "@nx/enforce-module-boundaries": boundaries },
  },
  {
    files: ["packages/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-restricted-globals": [
        "error",
        "window",
        "document",
        "navigator",
        "localStorage",
        "sessionStorage",
      ],
    },
  },
];

export default configuration;
