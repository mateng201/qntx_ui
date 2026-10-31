import {
  createMascotDockingCurve,
  getMascotDockingPosition,
  getMascotDockingProgress,
  mascotDockingTiming,
} from "@qntx-ui/mascot";
import type { MascotDockingCurve } from "@qntx-ui/mascot";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform } from "react-native";

import type { MascotPlaybackPhase } from "../animation/mascot-playback";

/** Only phase/route changes reach React. The native driver handles the travel frames. */
export function useMascotDocking(
  scrollY: Animated.Value,
  distance: number,
  width: number,
  height: number,
  reducedMotion: boolean,
): {
  docking: Animated.Value;
  curve: MascotDockingCurve;
  playbackPhase: MascotPlaybackPhase;
  getCenter: () => { x: number; y: number };
} {
  const [docking] = useState(() => new Animated.Value(0));
  const [curve, setCurve] = useState(createMascotDockingCurve);
  const [playbackPhase, setPlaybackPhase] = useState<MascotPlaybackPhase>("opening");
  const current = useRef(0);
  const route = useRef(curve);

  useEffect(() => {
    let progress = 0;
    let target = 0;
    let phase: MascotPlaybackPhase = "opening";
    let disposed = false;
    function updatePhase(): void {
      const next =
        progress === 0 && current.current <= 0.001
          ? "opening"
          : progress >= 1 && current.current >= 0.999
            ? "docked"
            : current.current > 0.6
              ? "arriving"
              : "scrolling";
      if (!disposed && phase !== next) {
        phase = next;
        setPlaybackPhase(next);
      }
    }
    const flight = docking.addListener(({ value }) => {
      current.current = value;
      updatePhase();
    });
    const scroll = scrollY.addListener(({ value }) => {
      progress = distance - value <= 2 ? 1 : Math.max(0, Math.min(1, value / distance));
      // At most twenty route targets per gesture, without rerendering React on each scroll frame.
      const next = Math.round(getMascotDockingProgress(progress) * 20) / 20;
      if (next !== target || (progress === 0 && next === 0 && current.current > 0.001)) {
        if (
          (target === 0 && current.current <= 0.001) ||
          (target === 1 && current.current >= 0.999)
        ) {
          const selected = createMascotDockingCurve(route.current);
          route.current = selected;
          setCurve(selected);
        }
        target = next;
        docking.stopAnimation();
        if (reducedMotion) {
          docking.setValue(next);
        } else {
          Animated.timing(docking, {
            toValue: next,
            duration: mascotDockingTiming.duration,
            easing: (value) => Easing.linear(value),
            useNativeDriver: Platform.OS !== "web",
          }).start();
        }
      }
      updatePhase();
    });
    return () => {
      disposed = true;
      scrollY.removeListener(scroll);
      docking.removeListener(flight);
      docking.stopAnimation();
    };
  }, [scrollY, docking, distance, reducedMotion]);

  function getCenter(): { x: number; y: number } {
    return getMascotDockingPosition(
      { x: width / 2, y: height / 2 },
      { x: 36, y: 32 },
      current.current,
      route.current,
    );
  }
  return { docking, curve, playbackPhase, getCenter };
}
