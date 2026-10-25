import {
  createCatalogAnimation,
  createMascotMorph,
  pathsForFrame,
  staticMascotFrame,
  staticMascotPaths,
} from "@qntx-ui/mascot";
import type { CatalogFrame, MascotPaths } from "@qntx-ui/mascot";
import type { ReactElement, Ref } from "react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { AppState } from "react-native";
import Svg, { Path } from "react-native-svg";

export type MascotPhase = "opening" | "narrative" | "docked";
export type MascotHandle = { activity: () => void };
type PlaybackOptions = { phase: MascotPhase; reducedMotion: boolean; foreground: boolean };
type Playback = MascotHandle & { update: (options: PlaybackOptions) => void; dispose: () => void };

/** Keep the frame loop independent of touches: repeated input must not restart a return morph. */
function createPlayback(onPaint: (paths: MascotPaths) => void): Playback {
  let options: PlaybackOptions = { phase: "opening", reducedMotion: false, foreground: true };
  let current: CatalogFrame = staticMascotFrame;
  let catalog: ReturnType<typeof createCatalogAnimation> | undefined;
  let transition:
    | { sample: ReturnType<typeof createMascotMorph>; started: number; duration: number }
    | undefined;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let playing = false;
  let idle = false;
  let lastPaint = -1000;

  function paint(now: number): void {
    frame = undefined;
    const target = catalog?.sample(now) ?? staticMascotFrame;
    if (transition === undefined) {
      current = target;
    } else {
      const progress = Math.min(1, (now - transition.started) / transition.duration);
      current = transition.sample(target, progress);
      if (progress === 1) {
        transition = undefined;
      }
    }
    if (playing || transition !== undefined) {
      // SVG paths use the JS thread; limit commits to this small component to 30fps.
      if (now - lastPaint >= 1000 / 30) {
        onPaint(pathsForFrame(current));
        lastPaint = now;
      }
      frame = requestAnimationFrame(paint);
    } else {
      current = staticMascotFrame;
      onPaint(staticMascotPaths);
    }
  }

  function synchronize(): void {
    const enabled = !options.reducedMotion && options.foreground;
    const wanted = enabled && (options.phase === "narrative" || idle);
    if (enabled) {
      if (playing !== wanted) {
        playing = wanted;
        catalog = wanted ? createCatalogAnimation() : undefined;
        const now = performance.now();
        transition = {
          sample: createMascotMorph(current, catalog?.sample(now) ?? staticMascotFrame),
          started: now,
          duration: wanted ? 360 : 320,
        };
      }
      if (playing || transition !== undefined) {
        frame ??= requestAnimationFrame(paint);
      }
    } else {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
      playing = false;
      catalog = undefined;
      transition = undefined;
      current = staticMascotFrame;
      frame = requestAnimationFrame(paint);
    }
  }

  function clearTimer(): void {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  }

  function restartWait(): void {
    idle = false;
    clearTimer();
    if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
      timer = setTimeout(() => {
        timer = undefined;
        if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
          idle = true;
          synchronize();
        }
      }, 5000);
    }
  }

  return {
    update(next): void {
      options = next;
      restartWait();
      synchronize();
    },
    activity(): void {
      if (options.phase !== "narrative" && !options.reducedMotion && options.foreground) {
        restartWait();
        synchronize();
      }
    },
    dispose(): void {
      clearTimer();
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    },
  };
}

/** Native SVG renderer; frame updates never rerender the surrounding page. */
export function Mascot({
  ref,
  size,
  phase,
  reducedMotion,
}: {
  ref?: Ref<MascotHandle>;
  size: number;
  phase: MascotPhase;
  reducedMotion: boolean;
}): ReactElement {
  const [drawing, setDrawing] = useState<MascotPaths>(staticMascotPaths);
  const controller = useRef<Playback | undefined>(undefined);
  const [foreground, setForeground] = useState(
    AppState.currentState === null || AppState.currentState === "active",
  );
  useImperativeHandle(ref, () => ({ activity: () => controller.current?.activity() }), []);

  useEffect(() => {
    const playback = createPlayback(setDrawing);
    controller.current = playback;
    const listener = AppState.addEventListener("change", (state) =>
      setForeground(state === "active"),
    );
    return () => {
      controller.current = undefined;
      playback.dispose();
      listener.remove();
    };
  }, []);

  useEffect(() => {
    controller.current?.update({ phase, reducedMotion, foreground });
  }, [phase, reducedMotion, foreground]);

  return (
    <Svg
      width={size}
      height={size}
      viewBox="-150 -150 300 300"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={drawing.body} fill="#1b1d19" fillRule="evenodd" testID="mobile-mascot-body" />
      <Path d={drawing.left} fill="#ffffff" />
      <Path d={drawing.right} fill="#ffffff" />
    </Svg>
  );
}
