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

import type { MascotPlaybackPhase } from "./animation/mascot-playback";
import { AnimatedMascot } from "./components/AnimatedMascot";
import type { MascotActivityHandle } from "./components/AnimatedMascot";
import { ExternalLink } from "./components/ExternalLink";
import { ResourcesSection, AboutSection, ProtocolsSection } from "./components/HomeSections";
import { useReducedMotion, useScreenReader } from "./hooks/useReducedMotion";

const headerHeight = 64;
const dockSize = 32;
const statusBarStyle = "dark";

type HomeSectionId = "opening" | "about" | "protocols" | "resources";

function MobileHomeScreen(): ReactElement {
  const dimensions = useWindowDimensions();
  const [viewport, setViewport] = useState({
    width: Math.min(dimensions.width, 760),
    height: dimensions.height,
  });
  const [scrollY] = useState(() => new Animated.Value(0));
  const [onScroll] = useState(() =>
    Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
      useNativeDriver: Platform.OS !== "web",
    }),
  );
  const scrollRef = useRef<ScrollViewInstance>(null);
  const offset = useRef(0);
  const previousPlaybackPhase = useRef<MascotPlaybackPhase>("opening");
  const [playbackPhase, setPlaybackPhase] = useState<MascotPlaybackPhase>("opening");
  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>("opening");
  const previousSectionId = useRef<HomeSectionId>("opening");
  const mascotRef = useRef<MascotActivityHandle>(null);
  const [documentScrollEnd, setDocumentScrollEnd] = useState(1);
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReader();
  const stageHeight = Math.max(1, viewport.height - headerHeight);
  const isDocumentLayout = viewport.height < 600 || dimensions.fontScale > 1.15 || screenReader;
  const scrollDistance = isDocumentLayout
    ? Math.max(stageHeight, documentScrollEnd)
    : stageHeight * 3.6;
  const compact = stageHeight < 650;
  const size = Math.min(190, viewport.width * 0.44);
  const viewportKey = `${viewport.width}:${viewport.height}:${dimensions.fontScale}`;
  const previousViewport = useRef(viewportKey);

  function notifyActivity(): void {
    mascotRef.current?.notifyActivity();
  }

  function scrollToTop(): void {
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
      const progress = y / scrollDistance;
      const nextPlaybackPhase =
        progress >= 0.999 ? "docked" : progress > 0 ? "scrolling" : "opening";
      if (nextPlaybackPhase !== previousPlaybackPhase.current) {
        previousPlaybackPhase.current = nextPlaybackPhase;
        setPlaybackPhase(nextPlaybackPhase);
      }
      const nextSectionId =
        progress < 0.16
          ? "opening"
          : progress < 0.49
            ? "about"
            : progress < 0.82
              ? "protocols"
              : "resources";
      if (previousSectionId.current !== nextSectionId) {
        previousSectionId.current = nextSectionId;
        setActiveSectionId(nextSectionId);
      }
    });
    return () => scrollY.removeListener(listener);
  }, [scrollY, scrollDistance]);

  useEffect(() => {
    if (previousViewport.current !== viewportKey) {
      previousViewport.current = viewportKey;
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      scrollY.setValue(0);
    }
  }, [viewportKey, scrollY]);

  const bounded = { extrapolate: "clamp" as const };
  const welcomeOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.12],
    outputRange: [1, 0],
    ...bounded,
  });
  const aboutOpacity = scrollY.interpolate({
    inputRange: [
      scrollDistance * 0.12,
      scrollDistance * 0.22,
      scrollDistance * 0.4,
      scrollDistance * 0.5,
    ],
    outputRange: [0, 1, 1, 0],
    ...bounded,
  });
  const protocolOpacity = scrollY.interpolate({
    inputRange: [
      scrollDistance * 0.46,
      scrollDistance * 0.56,
      scrollDistance * 0.72,
      scrollDistance * 0.82,
    ],
    outputRange: [0, 1, 1, 0],
    ...bounded,
  });
  const veilOpacity = scrollY.interpolate({
    inputRange: [scrollDistance * 0.8, scrollDistance * 0.98],
    outputRange: [1, 0],
    ...bounded,
  });
  const mascotOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.2, scrollDistance * 0.8, scrollDistance],
    outputRange: [1, 0.045, 0.045, 1],
    ...bounded,
  });
  const mascotScale = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.2, scrollDistance * 0.8, scrollDistance],
    outputRange: [1, 0.8, 0.8, dockSize / size],
    ...bounded,
  });
  const mascotX = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.8, scrollDistance],
    outputRange: [
      viewport.width / 2 - size / 2,
      viewport.width / 2 - size / 2,
      20 + dockSize / 2 - size / 2,
    ],
    ...bounded,
  });
  const mascotY = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.8, scrollDistance],
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
            playbackPhase === "docked"
              ? 20 + dockSize / 2 - size / 2
              : viewport.width / 2 - size / 2,
        },
        {
          translateY:
            playbackPhase === "docked"
              ? headerHeight / 2 - size / 2
              : headerHeight + stageHeight / 2 - size / 2,
        },
        { scale: playbackPhase === "docked" ? dockSize / size : 1 },
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
        testID="mobile-home-screen"
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="QuantX home"
            onPress={scrollToTop}
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
          testID="mobile-scroll-view"
          onScroll={onScroll}
          onScrollBeginDrag={notifyActivity}
          onScrollEndDrag={notifyActivity}
          onMomentumScrollEnd={notifyActivity}
        >
          {isDocumentLayout ? (
            <View>
              <View style={[styles.documentWelcome, { height: Math.max(stageHeight, 380) }]}>
                <View style={[styles.welcomeCaption, { marginTop: size / 2 + 30 }]}>
                  <Text style={styles.welcomeCopy}>
                    Independent agents.{"\n"}Shared possibilities.
                  </Text>
                  <Text style={styles.welcomeHint}>Swipe to discover ↓</Text>
                </View>
              </View>
              <View style={styles.documentSection} testID="mobile-document-about">
                <AboutSection compact />
              </View>
              <View style={styles.documentSection} testID="mobile-document-protocols">
                <ProtocolsSection compact isDocumentLayout />
              </View>
            </View>
          ) : (
            <View style={{ height: scrollDistance }} testID="mobile-scroll-track" />
          )}
          <View
            onLayout={(event) => {
              if (isDocumentLayout) {
                setDocumentScrollEnd(event.nativeEvent.layout.y);
              }
            }}
          >
            <ResourcesSection />
          </View>
        </Animated.ScrollView>

        {!isDocumentLayout && (
          <>
            <Animated.View
              pointerEvents="none"
              importantForAccessibility="no-hide-descendants"
              style={[styles.veil, { opacity: veilOpacity }]}
            />
            <View pointerEvents="none" style={styles.stage}>
              <Animated.View
                style={[styles.sectionOverlay, { opacity: welcomeOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "opening"}
                importantForAccessibility={
                  activeSectionId === "opening" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "opening"}
                testID="mobile-section-opening"
              >
                <View style={[styles.welcomeCaption, { marginTop: size / 2 + 30 }]}>
                  <Text style={styles.welcomeCopy}>
                    Independent agents.{"\n"}Shared possibilities.
                  </Text>
                  <Text style={styles.welcomeHint}>Swipe to discover ↓</Text>
                </View>
              </Animated.View>
              <Animated.View
                style={[styles.sectionOverlay, { opacity: aboutOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "about"}
                importantForAccessibility={
                  activeSectionId === "about" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "about"}
                testID="mobile-section-about"
              >
                <AboutSection compact={compact} />
              </Animated.View>
              <Animated.View
                style={[styles.sectionOverlay, { opacity: protocolOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "protocols"}
                importantForAccessibility={
                  activeSectionId === "protocols" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "protocols"}
                testID="mobile-section-protocols"
              >
                <ProtocolsSection compact={compact} />
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
          <AnimatedMascot
            ref={mascotRef}
            size={size}
            playbackPhase={playbackPhase}
            reducedMotion={reducedMotion}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

export function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <MobileHomeScreen />
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
  sectionOverlay: {
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
  welcomeCaption: { position: "absolute", top: "50%", left: 0, right: 0 },
  welcomeCopy: {
    color: "#1b1d19",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  welcomeHint: {
    color: "#5d6259",
    fontSize: 11,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 24,
  },
  documentWelcome: { justifyContent: "center", alignItems: "center" },
  documentSection: { paddingVertical: 46 },
});
