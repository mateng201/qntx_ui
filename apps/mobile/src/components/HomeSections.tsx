import { aboutDestinations, aboutIntro, hero, homePageCopy, links } from "@qntx-ui/content";
import { fontFamilies, homeTheme } from "@qntx-ui/design-tokens";
import type { ReactElement } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { ExternalLink } from "./ExternalLink";

const fontFamily =
  Platform.OS === "web"
    ? fontFamilies.web
    : Platform.OS === "ios"
      ? fontFamilies.ios
      : fontFamilies.android;

export function OpeningSection(): ReactElement {
  return (
    <View style={styles.opening} testID="mobile-opening-content">
      <Text accessibilityRole="header" style={styles.mission}>
        {homePageCopy.missionLead}
        {"\n"}
        <Text style={styles.missionAccent}>{homePageCopy.missionAccent}</Text>
      </Text>
      <Text style={styles.missionDetail}>{homePageCopy.missionDetail}</Text>
    </View>
  );
}
export function AboutSection({ compact = false }: { compact?: boolean }): ReactElement {
  return (
    <View style={styles.about} testID="mobile-about-content">
      <Text
        accessibilityRole="header"
        style={[styles.aboutTitle, compact && styles.aboutTitleCompact]}
      >
        {aboutIntro.titleLines[0]}
        {"\n"}
        <Text style={styles.aboutAccent}>{aboutIntro.titleLines[1]}</Text>
      </Text>
      <Text style={styles.aboutCopy}>{aboutIntro.description}</Text>
    </View>
  );
}
export function ResourcesSection({ compact = false }: { compact?: boolean }): ReactElement {
  return (
    <View
      style={[styles.resources, compact && styles.resourcesCompact]}
      testID="mobile-resources-content"
    >
      <Text
        accessibilityRole="header"
        style={[styles.resourcesTitle, compact && styles.resourcesTitleCompact]}
      >
        {hero.titleLines[0]}
        {"\n"}
        <Text style={styles.resourcesAccent}>{hero.titleLines[1]}</Text>
      </Text>
      <Text style={styles.resourcesCopy}>{homePageCopy.valueProposition}</Text>
      <View style={styles.actions}>
        <ExternalLink href={links.github} label={hero.primaryAction}>
          <View style={styles.primary}>
            <Text style={styles.primaryText}>{hero.primaryAction}</Text>
            <Text style={styles.primaryArrow}>↗</Text>
          </View>
        </ExternalLink>
        <ExternalLink href={links.github} label={hero.secondaryAction} />
      </View>
      <View style={styles.destinations}>
        {aboutDestinations.map((destination) => (
          <ExternalLink href={destination.href} label={destination.label} key={destination.number}>
            <View style={[styles.destination, compact && styles.destinationCompact]}>
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
    </View>
  );
}
const styles = StyleSheet.create({
  opening: { paddingHorizontal: 24, width: "100%", maxWidth: 620, alignSelf: "center" },
  mission: {
    fontFamily,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: "500",
    color: homeTheme.opening.ink,
    textAlign: "center",
  },
  missionAccent: { color: homeTheme.opening.accent },
  missionDetail: {
    fontFamily,
    fontSize: 15,
    lineHeight: 24,
    color: homeTheme.opening.copy,
    textAlign: "center",
    marginTop: 14,
  },
  about: { paddingHorizontal: 26, alignItems: "center", width: "100%" },
  aboutTitle: {
    fontFamily,
    color: homeTheme.about.ink,
    fontSize: 46,
    lineHeight: 53,
    letterSpacing: -1.5,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 26,
  },
  aboutTitleCompact: { fontSize: 38, lineHeight: 44 },
  aboutAccent: { color: homeTheme.about.accent },
  aboutCopy: {
    fontFamily,
    color: homeTheme.about.copy,
    fontSize: 16,
    lineHeight: 27,
    textAlign: "center",
    maxWidth: 520,
  },
  resources: {
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
  },
  resourcesCompact: { paddingVertical: 20 },
  resourcesTitle: {
    fontFamily,
    color: homeTheme.resources.ink,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "500",
    letterSpacing: -0.8,
    marginBottom: 24,
  },
  resourcesTitleCompact: { fontSize: 32, lineHeight: 38, marginBottom: 18 },
  resourcesAccent: { color: homeTheme.resources.accent },
  resourcesCopy: { fontFamily, color: homeTheme.resources.copy, fontSize: 16, lineHeight: 26 },
  actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 20, marginTop: 24 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    backgroundColor: "#1b1d19",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  primaryText: { fontFamily, color: "#ffffff", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  primaryArrow: { color: "#ffffff", fontSize: 21 },
  destinations: { marginTop: 26, gap: 8 },
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 22,
    paddingHorizontal: 12,
  },
  destinationCompact: { paddingVertical: 18 },
  destinationNumber: { fontFamily, color: homeTheme.resources.copy, fontSize: 12 },
  destinationCopy: { flex: 1, gap: 6 },
  destinationTitle: {
    fontFamily,
    color: homeTheme.resources.ink,
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "500",
  },
  destinationDetail: { fontFamily, color: homeTheme.resources.copy, fontSize: 13, lineHeight: 20 },
  destinationArrow: { color: homeTheme.resources.accent, fontSize: 22 },
});
