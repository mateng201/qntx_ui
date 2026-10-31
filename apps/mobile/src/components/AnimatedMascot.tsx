import { staticMascotPaths } from "@qntx-ui/mascot";
import type { MascotPaths } from "@qntx-ui/mascot";
import type { ReactElement, Ref } from "react";
import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { createMascotPlaybackController } from "../animation/mascot-playback";
import type {
  MascotActivityHandle,
  MascotPlaybackPhase,
  MascotPlaybackController,
} from "../animation/mascot-playback";

export type { MascotActivityHandle } from "../animation/mascot-playback";

// Web SVG forwards native-only accessibility props to the DOM unchanged.
const accessibilityProps =
  Platform.OS === "web"
    ? { "aria-hidden": true }
    : {
        accessibilityElementsHidden: true,
        importantForAccessibility: "no-hide-descendants" as const,
      };

type AnimatedMascotProps = {
  ref?: Ref<MascotActivityHandle>;
  size: number;
  playbackPhase: MascotPlaybackPhase;
  reducedMotion: boolean;
};

/** Native SVG renderer; frame updates never rerender the surrounding page. */
export function AnimatedMascot({
  ref,
  size,
  playbackPhase,
  reducedMotion,
}: AnimatedMascotProps): ReactElement {
  const [drawing, setDrawing] = useState<MascotPaths>(staticMascotPaths);
  const body = useRef<Path>(null);
  const left = useRef<Path>(null);
  const right = useRef<Path>(null);
  const controller = useRef<MascotPlaybackController | undefined>(undefined);
  const [foreground, setForeground] = useState(
    AppState.currentState === null || AppState.currentState === "active",
  );
  useImperativeHandle(
    ref,
    () => ({
      notifyActivity: () => controller.current?.notifyActivity(),
      setGaze: (gaze) => controller.current?.setGaze(gaze),
    }),
    [],
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      // Re-establish ownership after a development Fast Refresh as well as mount.
      body.current?.setNativeProps({ d: staticMascotPaths.body });
      left.current?.setNativeProps({ d: staticMascotPaths.left });
      right.current?.setNativeProps({ d: staticMascotPaths.right });
    }
    let previous = staticMascotPaths;
    const playback = createMascotPlaybackController((paths) => {
      if (Platform.OS === "web") {
        // react-native-svg's Web setNativeProps has a different signature.
        setDrawing(paths);
      } else {
        // Paths are animation-owned: avoid React reconciliation on every frame.
        if (paths.body !== previous.body) {
          body.current?.setNativeProps({
            d: paths.body,
            fill:
              paths.body === staticMascotPaths.body ? "#1b1d19" : "url(#mobile-mascot-material)",
          });
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
    controller.current?.updateOptions({ playbackPhase, reducedMotion, foreground });
  }, [playbackPhase, reducedMotion, foreground]);

  return (
    <Svg width={size} height={size} viewBox="-150 -150 300 300" {...accessibilityProps}>
      <Defs>
        <LinearGradient id="mobile-mascot-material" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#60645b" />
          <Stop offset="0.4" stopColor="#363a31" />
          <Stop offset="1" stopColor="#191c17" />
        </LinearGradient>
      </Defs>
      <Path
        ref={body}
        d={drawing.body}
        fill={drawing.body === staticMascotPaths.body ? "#1b1d19" : "url(#mobile-mascot-material)"}
        fillRule="evenodd"
        testID="mobile-mascot-body"
      />
      <Path ref={left} d={drawing.left} fill="#ffffff" />
      <Path ref={right} d={drawing.right} fill="#ffffff" />
    </Svg>
  );
}
