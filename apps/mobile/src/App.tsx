import {
  aboutDestinations,
  aboutIntro,
  hero,
  links,
  primitives,
  protocolIntro,
  sections,
  standards,
} from "@qntx-ui/content";
import type { SectionId } from "@qntx-ui/content";
import { palette, spacing, typeScale } from "@qntx-ui/design-tokens";
import { StatusBar } from "expo-status-bar";
import type { ReactElement } from "react";
import { useEffect, useState } from "react";
import { BackHandler, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { BrandMark } from "./components/BrandMark";
import { ExternalLink } from "./components/ExternalLink";

const copyrightYear = new Date().getFullYear();

function Overview({ explore }: { explore: () => void }): ReactElement {
  return (
    <View style={styles.page} testID="screen-overview">
      <Text accessibilityRole="header" style={styles.heroTitle}>
        {hero.titleLines.join("\n")}
      </Text>
      <Text style={styles.copy}>{hero.description}</Text>
      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={explore}
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryPressed]}
        >
          <Text style={styles.primaryLabel}>{hero.primaryAction}</Text>
          <Text style={styles.primaryArrow}>↗</Text>
        </Pressable>
        <ExternalLink href={links.github} label={hero.secondaryAction} />
      </View>
      <View style={styles.standards}>
        {standards.map((standard) => (
          <ExternalLink
            href={standard.href}
            label={`${standard.label} ${standard.detail}`}
            key={standard.label}
          >
            <View style={styles.standard}>
              <Text style={styles.standardTitle}>{standard.label}</Text>
              <Text style={styles.standardDetail}>/ {standard.detail}</Text>
            </View>
          </ExternalLink>
        ))}
      </View>
    </View>
  );
}

function Protocols(): ReactElement {
  return (
    <View style={styles.page} testID="screen-protocols">
      <Text accessibilityRole="header" style={styles.title}>
        {protocolIntro.titleLines.join("\n")}
      </Text>
      <Text style={styles.copy}>{protocolIntro.description}</Text>
      <View style={styles.ecosystem}>
        <ExternalLink href={links.products} label={protocolIntro.action} />
      </View>
      <View style={styles.protocols}>
        {primitives.map((primitive) => (
          <ExternalLink
            href={primitive.href}
            label={`${primitive.title}, ${primitive.standard}`}
            key={primitive.number}
          >
            <View style={styles.protocolCard}>
              <View style={styles.cardMeta}>
                <Text style={styles.number}>{primitive.number}</Text>
                <Text style={styles.badge}>{primitive.standard}</Text>
                <Text style={styles.cardArrow}>↗</Text>
              </View>
              <Text style={styles.cardTitle}>{primitive.title}</Text>
              <Text style={styles.cardCopy}>{primitive.description}</Text>
            </View>
          </ExternalLink>
        ))}
      </View>
    </View>
  );
}

function About(): ReactElement {
  return (
    <View style={styles.page} testID="screen-about">
      <Text accessibilityRole="header" style={[styles.title, styles.darkText]}>
        {aboutIntro.titleLines.join("\n")}
      </Text>
      <Text style={[styles.copy, styles.darkCopy]}>{aboutIntro.description}</Text>
      <View style={styles.ecosystem}>
        <ExternalLink href={links.website} label={aboutIntro.action} dark />
      </View>
      <View style={styles.signature}>
        <BrandMark size={34} color={palette.darkInk} />
        <Text style={styles.signatureCopy}>{aboutIntro.signatureLines.join("\n")}</Text>
      </View>
      <Text style={styles.destinationHeading}>{aboutIntro.destinationHeading}</Text>
      {aboutDestinations.map((destination) => (
        <ExternalLink
          href={destination.href}
          label={destination.label}
          dark
          key={destination.number}
        >
          <View style={styles.destination}>
            <Text style={styles.destinationNumber}>{destination.number}</Text>
            <View style={styles.destinationCopy}>
              <Text style={styles.destinationTitle}>{destination.label}</Text>
              <Text style={styles.destinationDetail}>{destination.detail}</Text>
            </View>
            <Text style={styles.destinationArrow}>↗</Text>
          </View>
        </ExternalLink>
      ))}
    </View>
  );
}

function MobileShell(): ReactElement {
  const [active, setActive] = useState<SectionId>("overview");
  const dark = active === "about";
  const ink = dark ? palette.darkInk : palette.ink;
  const backgroundColor = dark
    ? palette.darkSurface
    : active === "protocols"
      ? palette.protocolSurface
      : palette.surface;

  useEffect(() => {
    if (Platform.OS !== "android") {
      return undefined;
    }
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (active === "overview") {
        return false;
      }
      setActive("overview");
      return true;
    });
    return () => subscription.remove();
  }, [active]);

  return (
    <SafeAreaView style={[styles.shell, { backgroundColor }]}>
      <StatusBar style={dark ? "light" : "dark"} />
      <View style={styles.frame}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="QuantX home"
            onPress={() => setActive("overview")}
            style={styles.brand}
          >
            <BrandMark color={ink} />
            <Text style={[styles.brandName, { color: ink }]}>QuantX</Text>
          </Pressable>
          <View style={styles.headerLinks}>
            <ExternalLink href={links.github} label="GitHub" dark={dark} />
            <ExternalLink href={links.docs} label="Docs" dark={dark} />
          </View>
        </View>
        <ScrollView
          key={active}
          style={styles.scroller}
          contentContainerStyle={styles.scrollContent}
        >
          {active === "overview" && <Overview explore={() => setActive("protocols")} />}
          {active === "protocols" && <Protocols />}
          {active === "about" && <About />}
          <Text style={[styles.copyright, dark && styles.darkCopy]}>© {copyrightYear} QuantX</Text>
        </ScrollView>
        <View style={[styles.tabs, { borderTopColor: dark ? palette.darkLine : palette.line }]}>
          {sections.map((section) => {
            const selected = section.id === active;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                aria-selected={selected}
                accessibilityLabel={section.label}
                key={section.id}
                onPress={() => setActive(section.id)}
                style={({ pressed }) => [
                  styles.tab,
                  pressed && { backgroundColor: dark ? palette.darkHover : palette.hover },
                ]}
              >
                <View
                  style={[styles.tabIndicator, { backgroundColor: selected ? ink : "transparent" }]}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: selected ? ink : dark ? palette.darkMuted : palette.copy },
                  ]}
                >
                  {section.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </SafeAreaView>
  );
}

export function App(): ReactElement {
  return (
    <SafeAreaProvider>
      <MobileShell />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  frame: { flex: 1, width: "100%", maxWidth: 760, alignSelf: "center" },
  header: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: 9, minHeight: 44 },
  brandName: { fontSize: 22, fontWeight: "600", letterSpacing: -0.9 },
  headerLinks: { flexDirection: "row", gap: 20, alignItems: "center" },
  scroller: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  page: { flexGrow: 1 },
  heroTitle: {
    color: palette.ink,
    fontSize: 36,
    lineHeight: 43,
    letterSpacing: -1.6,
    fontWeight: "400",
    marginBottom: spacing.lg,
  },
  title: {
    color: palette.ink,
    fontSize: typeScale.title,
    lineHeight: 44,
    letterSpacing: -1.6,
    fontWeight: "400",
    marginBottom: spacing.lg,
  },
  copy: { color: palette.copy, fontSize: typeScale.body, lineHeight: 27 },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: palette.ink,
    minHeight: 50,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  primaryPressed: { backgroundColor: palette.accent },
  primaryLabel: { color: palette.surface, fontSize: 14, lineHeight: 22, fontWeight: "600" },
  primaryArrow: { color: palette.surface, fontSize: 21 },
  standards: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: spacing.lg,
    rowGap: spacing.md,
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  standard: { paddingVertical: 6, gap: 9 },
  standardTitle: { color: palette.copy, fontSize: 17, letterSpacing: -0.5, fontWeight: "600" },
  standardDetail: { color: palette.copy, fontSize: typeScale.caption, lineHeight: 18 },
  ecosystem: { marginTop: spacing.md, alignSelf: "flex-start" },
  protocols: { marginTop: spacing.lg, gap: spacing.sm, marginBottom: spacing.md },
  protocolCard: { paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: "#cdd1c7" },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: 18 },
  number: { color: palette.copy, fontSize: typeScale.caption },
  badge: {
    color: palette.badgeInk,
    backgroundColor: palette.badge,
    borderRadius: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: typeScale.caption,
    fontWeight: "500",
  },
  cardArrow: { marginLeft: "auto", color: palette.accent, fontSize: 22 },
  cardTitle: {
    color: palette.ink,
    fontSize: typeScale.subtitle,
    lineHeight: 30,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  cardCopy: { color: palette.copy, fontSize: 15, lineHeight: 25 },
  darkText: { color: palette.darkInk },
  darkCopy: { color: palette.darkCopy },
  signature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
  },
  signatureCopy: { color: palette.darkMuted, fontSize: typeScale.label, lineHeight: 22 },
  destinationHeading: {
    color: palette.darkMuted,
    fontSize: 11,
    lineHeight: 19,
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: palette.darkLine,
  },
  destinationNumber: { color: palette.darkMuted, fontSize: typeScale.caption },
  destinationCopy: { flex: 1, gap: 9 },
  destinationTitle: { color: palette.darkInk, fontSize: 20, lineHeight: 28, letterSpacing: -0.3 },
  destinationDetail: { color: palette.darkMuted, fontSize: typeScale.label, lineHeight: 21 },
  destinationArrow: { color: palette.darkCopy, fontSize: 23 },
  copyright: { color: palette.copy, fontSize: 11, lineHeight: 18, marginTop: spacing.xxl },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 58,
    paddingVertical: 10,
    borderRadius: 6,
  },
  tabIndicator: { width: 24, height: 2, borderRadius: 1 },
  tabLabel: { fontSize: 13, lineHeight: 20, fontWeight: "500" },
});
