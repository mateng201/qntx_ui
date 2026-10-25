import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform } from "react-native";

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    const listener = AccessibilityInfo.addEventListener("reduceMotionChanged", setReducedMotion);
    async function readPreference(): Promise<void> {
      try {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        if (mounted) {
          setReducedMotion(enabled);
        }
      } catch {
        // Keep the static opening while a platform without this API uses its default.
      }
    }
    void readPreference();
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return reducedMotion;
}

export function useScreenReader(): boolean {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // React Native Web returns true unconditionally; it cannot detect a browser screen reader.
    if (Platform.OS === "web") {
      return undefined;
    }
    let mounted = true;
    const listener = AccessibilityInfo.addEventListener("screenReaderChanged", setEnabled);
    async function readPreference(): Promise<void> {
      try {
        const active = await AccessibilityInfo.isScreenReaderEnabled();
        if (mounted) {
          setEnabled(active);
        }
      } catch {
        // Unsupported platforms retain the standard scroll narrative.
      }
    }
    void readPreference();
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return enabled;
}
