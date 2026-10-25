import { links } from "@qntx-ui/content";
import { StatusBar } from "expo-status-bar";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { ScrollViewInstance } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { ExternalLink } from "./components/ExternalLink";
import { Mascot } from "./components/Mascot";
import type { MascotHandle, MascotPhase } from "./components/Mascot";
import { ConnectContent, OriginContent, ProtocolContent } from "./components/NarrativeContent";
import { useReducedMotion, useScreenReader } from "./hooks/useReducedMotion";

const headerHeight = 64;
const dockSize = 32;
const statusBarStyle = "dark";

type Scene = "opening" | "origin" | "protocols" | "connect";

function MobileNarrative(): ReactElement {
  const dimensions = useWindowDimensions();
  const [viewport, setViewport] = useState({
    width: Math.min(dimensions.width, 760),
    height: dimensions.height,
  });
  const [scrollY] = useState(() => new Animated.Value(0));
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const playback = useRef<MascotPhase>("opening");
  const [phase, setPhase] = useState<MascotPhase>("opening");
  const [scene, setScene] = useState<Scene>("opening");
  const mascotRef = useRef<MascotHandle>(null);
  const [flowEnd, setFlowEnd] = useState(1);
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReader();
  const stageHeight = Math.max(1, viewport.height - headerHeight);
  const flow = viewport.height < 600 || dimensions.fontScale > 1.15 || screenReader;
  const span = flow ? Math.max(stageHeight, flowEnd) : stageHeight * 3.6;
  const compact = stageHeight < 650;
  const size = Math.min(190, viewport.width * 0.44);
  const viewportKey = `${viewport.width}:${viewport.height}:${dimensions.fontScale}`;
  const previousViewport = useRef(viewportKey);

  function notifyActivity(): void {
    mascotRef.current?.activity();
  }

  function home(): void {
    scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
  }

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }
    const listener = BackHandler.addEventListener("hardwareBackPress", () => {
      if (offset.current <= 1) {
        return false;
      }
      scrollRef.current?.scrollTo({ y: 0, animated: !reducedMotion });
      return true;
    });
    return () => listener.remove();
  }, [reducedMotion]);

  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      const y = Math.max(0, value);
      offset.current = y;
      const progress = y / span;
      const nextPhase = progress >= 0.999 ? "docked" : progress > 0 ? "narrative" : "opening";
      if (nextPhase !== playback.current) {
        playback.current = nextPhase;
        setPhase(nextPhase);
      }
      const nextScene =
        progress < 0.16
          ? "opening"
          : progress < 0.49
            ? "origin"
            : progress < 0.82
              ? "protocols"
              : "connect";
      setScene((previous) => (previous === nextScene ? previous : nextScene));
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, span]);

  useEffect(() => {
    if (previousViewport.current !== viewportKey) {
      previousViewport.current = viewportKey;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      scrollY.setValue(0);
    }
  }, [viewportKey, scrollY]);

  const bounded = { extrapolate: "clamp" as const };
  const openingOpacity = scrollY.interpolate({
    inputRange: [0, span * 0.12],
    outputRange: [1, 0],
    ...bounded,
  });
  const originOpacity = scrollY.interpolate({
    inputRange: [span * 0.12, span * 0.22, span * 0.4, span * 0.5],
    outputRange: [0, 1, 1, 0],
    ...bounded,
  });
  const protocolOpacity = scrollY.interpolate({
    inputRange: [span * 0.46, span * 0.56, span * 0.72, span * 0.82],
    outputRange: [0, 1, 1, 0],
    ...bounded,
  });
  const veilOpacity = scrollY.interpolate({
    inputRange: [span * 0.8, span * 0.98],
    outputRange: [1, 0],
    ...bounded,
  });
  const mascotOpacity = scrollY.interpolate({
    inputRange: [0, span * 0.2, span * 0.8, span],
    outputRange: [1, 0.045, 0.045, 1],
    ...bounded,
  });
  const mascotScale = scrollY.interpolate({
    inputRange: [0, span * 0.2, span * 0.8, span],
    outputRange: [1, 0.8, 0.8, dockSize / size],
    ...bounded,
  });
  const mascotX = scrollY.interpolate({
    inputRange: [0, span * 0.8, span],
    outputRange: [
      viewport.width / 2 - size / 2,
      viewport.width / 2 - size / 2,
      20 + dockSize / 2 - size / 2,
    ],
    ...bounded,
  });
  const mascotY = scrollY.interpolate({
    inputRange: [0, span * 0.8, span],
    outputRange: [
      headerHeight + stageHeight / 2 - size / 2,
      headerHeight + stageHeight / 2 - size / 2,
      headerHeight / 2 - size / 2,
    ],
    ...bounded,
  });
  const mascotTransform = reducedMotion
    ? [
        {
          translateX:
            phase === "docked" ? 20 + dockSize / 2 - size / 2 : viewport.width / 2 - size / 2,
        },
        {
          translateY:
            phase === "docked"
              ? headerHeight / 2 - size / 2
              : headerHeight + stageHeight / 2 - size / 2,
        },
        { scale: phase === "docked" ? dockSize / size : 1 },
      ]
    : [{ translateX: mascotX }, { translateY: mascotY }, { scale: mascotScale }];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* oxlint-disable-next-line react/style-prop-object -- Expo StatusBar uses a light/dark enum, not a View style. */}
      <StatusBar style={statusBarStyle} />
      <View
        style={styles.frame}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setViewport((previous) =>
            previous.width === width && previous.height === height ? previous : { width, height },
          );
        }}
        onTouchStart={notifyActivity}
        onTouchMove={notifyActivity}
        onTouchEnd={notifyActivity}
        onPointerMove={notifyActivity}
        testID="mobile-narrative"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="QuantX home"
            onPress={home}
            style={styles.brand}
          >
            <View style={styles.dock} testID="mobile-mascot-dock" />
            <Text style={styles.brandName}>QuantX</Text>
          </Pressable>
          <View style={styles.headerLinks}>
            <ExternalLink href={links.github} label="GitHub" />
            <ExternalLink href={links.docs} label="Docs" />
          </View>
        </View>

        <Animated.ScrollView
          ref={scrollRef}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          testID="mobile-story-scroll"
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: Platform.OS !== "web",
          })}
          onScrollBeginDrag={notifyActivity}
          onScrollEndDrag={notifyActivity}
          onMomentumScrollEnd={notifyActivity}
        >
          {flow ? (
            <View>
              <View style={[styles.flowOpening, { height: Math.max(stageHeight, 380) }]}>
                <View style={[styles.openingCaption, { marginTop: size / 2 + 30 }]}>
                  <Text style={styles.openingCopy}>
                    Independent agents.{"\n"}Shared possibilities.
                  </Text>
                  <Text style={styles.openingHint}>Swipe to discover ↓</Text>
                </View>
              </View>
              <View style={styles.flowSection} testID="mobile-flow-origin">
                <OriginContent compact />
              </View>
              <View style={styles.flowSection} testID="mobile-flow-protocols">
                <ProtocolContent compact flow />
              </View>
            </View>
          ) : (
            <View style={{ height: span }} testID="mobile-story-track" />
          )}
          <View
            onLayout={(event) => {
              if (flow) {
                setFlowEnd(event.nativeEvent.layout.y);
              }
            }}
          >
            <ConnectContent />
          </View>
        </Animated.ScrollView>

        {!flow && (
          <>
            <Animated.View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              style={[styles.veil, { opacity: veilOpacity }]}
            />
            <View pointerEvents="none" style={styles.stage}>
              <Animated.View
                style={[styles.scene, { opacity: openingOpacity }]}
                accessibilityElementsHidden={scene !== "opening"}
                importantForAccessibility={scene === "opening" ? "auto" : "no-hide-descendants"}
                aria-hidden={scene !== "opening"}
                testID="mobile-scene-opening"
              >
                <View style={[styles.openingCaption, { marginTop: size / 2 + 30 }]}>
                  <Text style={styles.openingCopy}>
                    Independent agents.{"\n"}Shared possibilities.
                  </Text>
                  <Text style={styles.openingHint}>Swipe to discover ↓</Text>
                </View>
              </Animated.View>
              <Animated.View
                style={[styles.scene, { opacity: originOpacity }]}
                accessibilityElementsHidden={scene !== "origin"}
                importantForAccessibility={scene === "origin" ? "auto" : "no-hide-descendants"}
                aria-hidden={scene !== "origin"}
                testID="mobile-scene-origin"
              >
                <OriginContent compact={compact} />
              </Animated.View>
              <Animated.View
                style={[styles.scene, { opacity: protocolOpacity }]}
                accessibilityElementsHidden={scene !== "protocols"}
                importantForAccessibility={scene === "protocols" ? "auto" : "no-hide-descendants"}
                aria-hidden={scene !== "protocols"}
                testID="mobile-scene-protocols"
              >
                <ProtocolContent compact={compact} />
              </Animated.View>
            </View>
          </>
        )}
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          testID="mobile-mascot"
          style={[
            styles.mascot,
            { width: size, height: size, opacity: mascotOpacity, transform: mascotTransform },
          ]}
        >
          <Mascot ref={mascotRef} size={size} phase={phase} reducedMotion={reducedMotion} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <MobileNarrative />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#fafaf8" },
  frame: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center", position: "relative" },
  header: {
    height: headerHeight,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    zIndex: 20,
    backgroundColor: "#fafaf8",
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44 },
  dock: { width: dockSize, height: dockSize },
  brandName: { color: "#1b1d19", fontSize: 22, fontWeight: "600", letterSpacing: -0.9 },
  headerLinks: { flexDirection: "row", gap: 16, alignItems: "center" },
  scroller: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  veil: {
    position: "absolute",
    top: headerHeight,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#fafaf8",
    zIndex: 4,
  },
  stage: { position: "absolute", top: headerHeight, left: 0, right: 0, bottom: 0, zIndex: 5 },
  scene: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 22,
  },
  mascot: { position: "absolute", left: 0, top: 0, zIndex: 30 },
  openingCaption: { position: "absolute", top: "50%", left: 0, right: 0 },
  openingCopy: {
    color: "#1b1d19",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  openingHint: {
    color: "#5d6259",
    fontSize: 11,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 24,
  },
  flowOpening: { justifyContent: "center", alignItems: "center" },
  flowSection: { paddingVertical: 46 },
});
