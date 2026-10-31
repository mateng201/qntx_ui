import { links } from "@qntx-ui/content";
import { fontFamilies } from "@qntx-ui/design-tokens";
import { easeMascotDocking, getMascotDockingPosition, mascotDockingTiming } from "@qntx-ui/mascot";
import { StatusBar } from "expo-status-bar";
import type { ComponentRef, ReactElement } from "react";
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

import { AnimatedMascot } from "./components/AnimatedMascot";
import type { MascotActivityHandle } from "./components/AnimatedMascot";
import { ExternalLink } from "./components/ExternalLink";
import { ResourcesSection, AboutSection, OpeningSection } from "./components/HomeSections";
import { useMascotDocking } from "./hooks/useMascotDocking";
import { useReducedMotion, useScreenReader } from "./hooks/useReducedMotion";

const headerHeight = 64;
const dockSize = 32;
const fontFamily =
  Platform.OS === "web"
    ? fontFamilies.web
    : Platform.OS === "ios"
      ? fontFamilies.ios
      : fontFamilies.android;
type HomeSectionId = "opening" | "about" | "resources";

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
  const frameRef = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef({ x: 0, y: 0 });
  const offset = useRef(0);
  const [activeSectionId, setActiveSectionId] = useState<HomeSectionId>("opening");
  const mascotRef = useRef<MascotActivityHandle>(null);
  const [documentScrollEnd, setDocumentScrollEnd] = useState(1);
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReader();
  const stageHeight = Math.max(1, viewport.height - headerHeight);
  const isDocumentLayout =
    viewport.width < 360 || viewport.height < 760 || dimensions.fontScale > 1.15 || screenReader;
  const scrollDistance = isDocumentLayout ? Math.max(1, documentScrollEnd) : stageHeight * 2.8;
  const size = Math.min(190, Math.max(144, viewport.width * 0.38));
  const { docking, curve, playbackPhase, getCenter } = useMascotDocking(
    scrollY,
    scrollDistance,
    viewport.width,
    viewport.height,
    reducedMotion,
  );
  const viewportKey = [viewport.width, viewport.height, dimensions.fontScale].join(":");
  const previousViewport = useRef(viewportKey);

  function notifyActivity(): void {
    mascotRef.current?.notifyActivity();
  }
  function followPointer(pageX: number, pageY: number): void {
    notifyActivity();
    const center = getCenter();
    mascotRef.current?.setGaze({
      x: Math.max(
        -1,
        Math.min(1, (pageX - origin.current.x - center.x) / Math.max(200, viewport.width * 0.4)),
      ),
      y: Math.max(
        -1,
        Math.min(1, (pageY - origin.current.y - center.y) / Math.max(220, viewport.height * 0.4)),
      ),
    });
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
    let previous: HomeSectionId = "opening";
    const listener = scrollY.addListener(({ value }) => {
      offset.current = Math.max(0, value);
      const progress = offset.current / scrollDistance;
      const next =
        progress < 0.2
          ? "opening"
          : progress < mascotDockingTiming.scrollStart
            ? "about"
            : "resources";
      if (next !== previous) {
        previous = next;
        setActiveSectionId(next);
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
      scrollDistance * 0.18,
      scrollDistance * 0.28,
      scrollDistance * 0.48,
      scrollDistance * 0.58,
    ],
    outputRange: [0, 1, 1, 0],
    ...bounded,
  });
  const recedingOpacity = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.2],
    outputRange: [1, 0.045],
    ...bounded,
  });
  const recedingScale = scrollY.interpolate({
    inputRange: [0, scrollDistance * 0.2],
    outputRange: [1, 0.8],
    ...bounded,
  });
  const samples = Array.from({ length: 41 }, (_, index) => index / 40);
  const positions = samples.map((progress) =>
    getMascotDockingPosition(
      { x: viewport.width / 2, y: viewport.height / 2 },
      { x: 36, y: 32 },
      progress,
      curve,
    ),
  );
  const map = (values: number[]) =>
    docking.interpolate({ inputRange: samples, outputRange: values, ...bounded });
  // The native driver applies the same eased flight progress to the final scene.
  const resourceOpacity = map(samples.map(easeMascotDocking));
  const synchronizedAboutOpacity = Animated.multiply(
    aboutOpacity,
    Animated.subtract(1, resourceOpacity),
  );
  const lift = samples.map((progress) => Math.sin(Math.PI * progress) ** 2);
  const arrival = samples.map((progress) => {
    const t = Math.min(1, Math.max(0, (progress - 0.78) / 0.22));
    return t * t * (3 - 2 * t);
  });
  const opacity = Animated.add(
    recedingOpacity,
    map(
      samples.map(
        (progress, index) =>
          (0.045 + 0.22 * Math.sin(Math.PI * progress)) * (1 - (arrival[index] ?? 0)) +
          (arrival[index] ?? 0) -
          0.045,
      ),
    ),
  );
  const transform = [
    { translateX: map(positions.map((position) => position.x - size / 2)) },
    { translateY: map(positions.map((position) => position.y - size / 2)) },
    { perspective: 850 },
    {
      rotateX: docking.interpolate({
        inputRange: samples,
        outputRange: lift.map((value) => `${-12 * value}deg`),
        ...bounded,
      }),
    },
    {
      rotateY: docking.interpolate({
        inputRange: samples,
        outputRange: lift.map((value) => `${Math.sign(curve.bend) * 20 * value}deg`),
        ...bounded,
      }),
    },
    {
      scale: Animated.multiply(
        recedingScale,
        map(
          samples.map(
            (progress) =>
              1 + (dockSize / (size * 0.8) - 1) * progress * progress * (3 - 2 * progress),
          ),
        ),
      ),
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* oxlint-disable-next-line react/style-prop-object -- Expo StatusBar uses an enum. */}
      <StatusBar style="dark" />
      <View
        ref={frameRef}
        style={styles.frame}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setViewport((previous) =>
            previous.width === width && previous.height === height ? previous : { width, height },
          );
          frameRef.current?.measureInWindow((x, y) => {
            origin.current = { x, y };
          });
        }}
        onTouchStart={(event) => followPointer(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onTouchMove={(event) => followPointer(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onTouchEnd={() => mascotRef.current?.setGaze(undefined)}
        onPointerMove={(event) => followPointer(event.nativeEvent.pageX, event.nativeEvent.pageY)}
        onPointerLeave={() => mascotRef.current?.setGaze(undefined)}
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
            <ExternalLink href={links.github} label="GitHub" icon="github" />
            <ExternalLink href={links.docs} label="Docs" arrowFirst />
          </View>
        </View>
        <Animated.ScrollView
          stickyHeaderIndices={isDocumentLayout ? [] : [0]}
          ref={scrollRef}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
          scrollEventThrottle={16}
          testID="mobile-scroll-view"
          onScroll={onScroll}
          onContentSizeChange={(_width, height) => {
            if (isDocumentLayout) {
              setDocumentScrollEnd(Math.max(1, height - stageHeight));
            }
          }}
          onScrollBeginDrag={notifyActivity}
          onScrollEndDrag={notifyActivity}
          onMomentumScrollEnd={notifyActivity}
        >
          {isDocumentLayout ? (
            <View>
              <View style={{ height: Math.max(stageHeight, 480), position: "relative" }}>
                <View
                  style={[
                    styles.welcomeCaption,
                    { top: viewport.height / 2 - headerHeight + size / 2 + 26 },
                  ]}
                >
                  <OpeningSection />
                </View>
              </View>
              <View
                style={[styles.documentSection, { minHeight: stageHeight }]}
                testID="mobile-document-about"
              >
                <AboutSection compact />
              </View>
              <View testID="mobile-document-resources">
                <ResourcesSection />
              </View>
            </View>
          ) : (
            <View
              pointerEvents="box-none"
              style={[styles.stage, { height: stageHeight }]}
              testID="mobile-scroll-stage"
            >
              <Animated.View
                pointerEvents="none"
                style={[styles.sectionOverlay, { opacity: welcomeOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "opening"}
                importantForAccessibility={
                  activeSectionId === "opening" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "opening"}
                testID="mobile-section-opening"
              >
                <View
                  style={[
                    styles.welcomeCaption,
                    { top: viewport.height / 2 - headerHeight + size / 2 + 26 },
                  ]}
                >
                  <OpeningSection />
                </View>
              </Animated.View>
              <Animated.View
                pointerEvents="none"
                style={[styles.sectionOverlay, { opacity: synchronizedAboutOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "about"}
                importantForAccessibility={
                  activeSectionId === "about" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "about"}
                testID="mobile-section-about"
              >
                <AboutSection compact={stageHeight < 650} />
              </Animated.View>
              <Animated.View
                pointerEvents={activeSectionId === "resources" ? "box-none" : "none"}
                style={[styles.sectionOverlay, { opacity: resourceOpacity }]}
                accessibilityElementsHidden={activeSectionId !== "resources"}
                importantForAccessibility={
                  activeSectionId === "resources" ? "auto" : "no-hide-descendants"
                }
                aria-hidden={activeSectionId !== "resources"}
                testID="mobile-section-resources"
              >
                <ResourcesSection compact />
              </Animated.View>
            </View>
          )}
          {!isDocumentLayout && (
            <View style={{ height: scrollDistance }} testID="mobile-scroll-track" />
          )}
        </Animated.ScrollView>
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          aria-hidden
          testID="mobile-mascot"
          style={[styles.mascot, { width: size, height: size, opacity, transform }]}
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
  brandName: { fontFamily, color: "#1b1d19", fontSize: 22, fontWeight: "600", letterSpacing: -0.5 },
  headerLinks: { flexDirection: "row", gap: 16, alignItems: "center" },
  scroller: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  stage: { position: "relative", width: "100%", zIndex: 5 },
  sectionOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
  },
  mascot: { position: "absolute", left: 0, top: 0, zIndex: 30 },
  welcomeCaption: { position: "absolute", left: 0, right: 0 },
  documentSection: { paddingVertical: 46, justifyContent: "center" },
});
