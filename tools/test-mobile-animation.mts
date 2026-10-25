/// <reference types="node" />
/// <reference lib="es2023" />

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { test } from "node:test";
import type { TestContext } from "node:test";
import { fileURLToPath } from "node:url";

// Node strips TypeScript; the apps' bundlers additionally resolve extensionless
// imports and JSON. Mirror only those two rules for these workspace-only tests.
const root = new URL("../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "ERR_MODULE_NOT_FOUND" &&
        specifier.startsWith(".")
      ) {
        const candidate = new URL(`${specifier}.ts`, context.parentURL);
        if (candidate.href.startsWith(root) && existsSync(candidate)) {
          return next(candidate.href, context);
        }
      }
      throw error;
    }
  },
  load(url, context, next) {
    if (url.startsWith(root) && url.endsWith(".ts")) {
      return {
        format: "module-typescript",
        source: readFileSync(fileURLToPath(url), "utf8"),
        shortCircuit: true,
      };
    }
    if (url.startsWith(root) && url.endsWith(".json")) {
      return {
        format: "module",
        source: `export default ${readFileSync(fileURLToPath(url), "utf8")};`,
        shortCircuit: true,
      };
    }
    return next(url, context);
  },
});

const { createCatalogAnimation, createMascotMorph, staticMascotFrame, staticMascotPaths } =
  await import("@qntx-ui/mascot");
const { createPlayback } = await import("../apps/mobile/src/animation/playback.ts");

function clock(context: TestContext) {
  let now = 0;
  let nextId = 0;
  let scheduledTimers = 0;
  const frames = new Map<number, (now: number) => void>();
  const timers = new Map<number, { callback: () => void; at: number }>();
  const oldRaf = Object.getOwnPropertyDescriptor(globalThis, "requestAnimationFrame");
  const oldCancel = Object.getOwnPropertyDescriptor(globalThis, "cancelAnimationFrame");
  Object.defineProperty(globalThis, "requestAnimationFrame", {
    configurable: true,
    value: (callback: (now: number) => void) => {
      nextId += 1;
      frames.set(nextId, callback);
      return nextId;
    },
  });
  Object.defineProperty(globalThis, "cancelAnimationFrame", {
    configurable: true,
    value: (id: number) => frames.delete(id),
  });
  context.mock.method(performance, "now", () => now);
  context.mock.method(globalThis, "setTimeout", (callback: () => void, delay: number) => {
    scheduledTimers += 1;
    nextId += 1;
    timers.set(nextId, { callback, at: now + delay });
    return nextId;
  });
  context.mock.method(globalThis, "clearTimeout", (id: number) => timers.delete(id));
  context.after(() => {
    for (const [key, descriptor] of [
      ["requestAnimationFrame", oldRaf],
      ["cancelAnimationFrame", oldCancel],
    ] as const) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(globalThis, key);
      } else {
        Object.defineProperty(globalThis, key, descriptor);
      }
    }
  });
  return {
    get scheduledTimers() {
      return scheduledTimers;
    },
    get pending() {
      return frames.size + timers.size;
    },
    advance(duration: number, hz = 120, input?: () => void) {
      const until = now + duration;
      while (now < until) {
        now = Math.min(until, now + 1000 / hz);
        input?.();
        for (const [id, timer] of timers) {
          if (now >= timer.at) {
            timers.delete(id);
            timer.callback();
          }
        }
        const callbacks = [...frames.values()];
        frames.clear();
        for (const callback of callbacks) {
          callback(now);
        }
      }
    },
  };
}

void test("direct native geometry matches the original pipeline through the full catalog", (context) => {
  context.mock.method(Math, "random", () => 0.5);
  const legacy = createCatalogAnimation(() => 0);
  const direct = createCatalogAnimation(() => 0, { directGeometry: true });
  for (let frame = 0; frame <= 1800; frame += 1) {
    const time = (frame * 1000) / 30;
    assert.deepEqual(direct.sample(time), legacy.sample(time), `geometry at ${time}ms`);
  }
});

for (const hz of [60, 90, 120]) {
  void test(`${hz}Hz caps frame sampling at about 30 per second`, (context) => {
    const time = clock(context);
    let samples = 0;
    let paints = 0;
    const player = createPlayback(
      () => {
        paints += 1;
      },
      () => {
        const animation = createCatalogAnimation(undefined, { directGeometry: true });
        return {
          sample: (now) => {
            samples += 1;
            return animation.sample(now);
          },
        };
      },
    );
    player.update({ phase: "narrative", reducedMotion: false, foreground: true });
    time.advance(1000, hz);
    assert.ok(samples >= 29 && samples <= 32, `${samples} including the initial alignment sample`);
    assert.ok(paints >= 28 && paints <= 31, `${paints} paints`);
    player.dispose();
    assert.equal(time.pending, 0);
  });
}

void test("input moves the idle deadline without allocating timers per touch", (context) => {
  const time = clock(context);
  let drawing = staticMascotPaths;
  const player = createPlayback((paths) => {
    drawing = paths;
  });
  player.update({ phase: "opening", reducedMotion: false, foreground: true });
  time.advance(2000, 120, player.activity);
  assert.equal(time.scheduledTimers, 1);
  time.advance(4990);
  assert.equal(drawing, staticMascotPaths);
  time.advance(500);
  assert.notEqual(drawing.body, staticMascotPaths.body);
  time.advance(650, 120, player.activity);
  assert.equal(drawing, staticMascotPaths, "continuous input must finish the return morph");
  assert.ok(time.scheduledTimers <= 3);
  player.update({ phase: "narrative", reducedMotion: false, foreground: true });
  time.advance(500, 120, player.activity);
  assert.notEqual(drawing.body, staticMascotPaths.body, "narrative ignores input resets");
  player.update({ phase: "docked", reducedMotion: false, foreground: true });
  time.advance(400);
  assert.equal(drawing, staticMascotPaths);
  time.advance(4500);
  assert.equal(drawing, staticMascotPaths);
  time.advance(500);
  assert.notEqual(drawing.body, staticMascotPaths.body);
  player.dispose();
  assert.equal(time.pending, 0);
});

void test("background and reduced-motion stop animation and leave no repeating frame work", (context) => {
  const time = clock(context);
  let drawing = staticMascotPaths;
  const player = createPlayback((paths) => {
    drawing = paths;
  });
  player.update({ phase: "narrative", reducedMotion: false, foreground: true });
  time.advance(500);
  player.update({ phase: "narrative", reducedMotion: false, foreground: false });
  time.advance(100);
  assert.equal(drawing, staticMascotPaths);
  assert.equal(time.pending, 0);
  player.update({ phase: "narrative", reducedMotion: true, foreground: true });
  time.advance(100);
  assert.equal(drawing, staticMascotPaths);
  assert.equal(time.pending, 0);
  player.dispose();
});

void test("contour alignment does not twist a reversed, offset closed contour", () => {
  const { outer } = staticMascotFrame;
  const reversed = outer.toReversed();
  const shifted = [...reversed.slice(17), ...reversed.slice(0, 17)];
  const target = { ...staticMascotFrame, outer: shifted };
  const morph = createMascotMorph(staticMascotFrame, target);
  assert.deepEqual(morph(target, 0.5).outer, shifted);
});
