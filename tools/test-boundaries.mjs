/* eslint-disable no-await-in-loop -- Each probe is checked and removed before the next one. */
import assert from "node:assert/strict";
import { writeFile, unlink } from "node:fs/promises";
import path from "node:path";

import { createProjectGraphAsync } from "@nx/devkit";
import { ESLint } from "eslint";

const root = path.resolve(import.meta.dirname, "..");
process.chdir(root);
await createProjectGraphAsync();
const eslint = new ESLint({ cwd: root });
const probes = [
  {
    file: "apps/web/src/__boundary_probe__.ts",
    source: 'import { App } from "../../mobile/src/App"; export { App };',
    forbidden: true,
  },
  {
    file: "apps/mobile/src/__boundary_probe__.ts",
    source: 'import { HomeIntro } from "../../web/src/components/HomeIntro"; export { HomeIntro };',
    forbidden: true,
  },
  {
    file: "packages/content/src/__boundary_probe__.ts",
    source: 'import { View } from "react-native"; export { View };',
    forbidden: true,
  },
  {
    file: "packages/content/src/__boundary_probe__.ts",
    source: 'import { links } from "../../../apps/web/src/data/site"; export { links };',
    forbidden: true,
  },
  {
    file: "packages/content/src/__boundary_probe__.ts",
    source: "export const value = window.location.href;",
    forbidden: true,
  },
  {
    file: "apps/web/src/__boundary_probe__.astro",
    source: '---\nimport { App } from "../../mobile/src/App";\n---\n<App />\n',
    forbidden: true,
  },
  {
    file: "apps/web/src/__boundary_probe__.ts",
    source: 'import { links } from "@qntx-ui/content"; export const url = links.website;',
    forbidden: false,
  },
];

for (const probe of probes) {
  const target = path.resolve(root, probe.file);
  assert.ok(target.startsWith(root + path.sep));
  await writeFile(target, probe.source, { flag: "wx" });
  try {
    const results = await eslint.lintFiles([target]);
    const errors = results.flatMap((result) =>
      result.messages.filter((message) => message.severity === 2),
    );
    if (probe.forbidden) {
      assert.ok(
        errors.some(
          (error) =>
            error.ruleId === "@nx/enforce-module-boundaries" ||
            error.ruleId === "no-restricted-globals",
        ),
        `Expected a boundary rejection for ${probe.file}: ${JSON.stringify(errors)}`,
      );
    } else {
      assert.equal(errors.length, 0, `Expected a valid shared import: ${JSON.stringify(errors)}`);
    }
  } finally {
    await unlink(target);
  }
}

process.stdout.write(
  "Boundary probes passed: six forbidden dependencies/globals rejected, one shared import allowed (including Astro frontmatter).\n",
);
