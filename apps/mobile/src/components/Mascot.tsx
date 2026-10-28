import { staticMascotPaths } from "@qntx-ui/mascot";
import type { MascotPaths } from "@qntx-ui/mascot";
import type { ReactElement, Ref } from "react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import Svg, { Path } from "react-native-svg";

import { createPlayback } from "../animation/playback";
import type { MascotHandle, MascotPhase, Playback } from "../animation/playback";

export type { MascotHandle } from "../animation/playback";

// Web SVG forwards native-only accessibility props to the DOM unchanged.
const accessibilityProps =
  Platform.OS === "web"
    ? { "aria-hidden": true }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };

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
  const body = useRef<Path>(null);
  const left = useRef<Path>(null);
  const right = useRef<Path>(null);
  const controller = useRef<Playback | undefined>(undefined);
  const [foreground, setForeground] = useState(
    AppState.currentState === null || AppState.currentState === "active",
  );
  useImperativeHandle(ref, () => ({ activity: () => controller.current?.activity() }), []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      // Re-establish ownership after a development Fast Refresh as well as mount.
      body.current?.setNativeProps({ d: staticMascotPaths.body });
      left.current?.setNativeProps({ d: staticMascotPaths.left });
      right.current?.setNativeProps({ d: staticMascotPaths.right });
    }
    let previous = staticMascotPaths;
    const playback = createPlayback((paths) => {
      if (Platform.OS === "web") {
        // react-native-svg's Web setNativeProps has a different signature.
        setDrawing(paths);
      } else {
        // Paths are animation-owned: avoid React reconciliation on every frame.
        if (paths.body !== previous.body) {
          body.current?.setNativeProps({ d: paths.body });
        }
        if (paths.left !== previous.left) {
          left.current?.setNativeProps({ d: paths.left });
        }
        if (paths.right !== previous.right) {
          right.current?.setNativeProps({ d: paths.right });
        }
      }
      previous = paths;
    });
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
    <Svg width={size} height={size} viewBox="-150 -150 300 300" {...accessibilityProps}>
      <Path
        ref={body}
        d={drawing.body}
        fill="#1b1d19"
        fillRule="evenodd"
        testID="mobile-mascot-body"
      />
      <Path ref={left} d={drawing.left} fill="#ffffff" />
      <Path ref={right} d={drawing.right} fill="#ffffff" />
    </Svg>
  );
}
