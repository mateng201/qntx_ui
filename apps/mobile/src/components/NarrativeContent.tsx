import {
  aboutDestinations,
  aboutIntro,
  hero,
  links,
  primitives,
  protocolIntro,
  standards,
} from "@qntx-ui/content";
import type { ReactElement } from "react";
import { StyleSheet, Text, View } from "react-native";

import { ExternalLink } from "./ExternalLink";

export function OriginContent({ compact = false }: { compact?: boolean }): ReactElement {
  return (
    <View style={styles.origin} testID="mobile-origin-content">
      <Text style={styles.kicker}>A SHARED STARTING POINT</Text>
      <Text
        accessibilityRole="header"
        style={[styles.originTitle, compact && styles.originTitleCompact]}
      >
        {aboutIntro.titleLines[0]}
        {"\n"}
        <Text style={styles.accent}>{aboutIntro.titleLines[1]}</Text>
      </Text>
      <Text style={[styles.originCopy, compact && styles.originCopyCompact]}>
        {aboutIntro.description}
      </Text>
      <Text style={styles.signature}>{aboutIntro.signatureLines.join(" ")}</Text>
    </View>
  );
}

export function ProtocolContent({
  compact = false,
  flow = false,
}: {
  compact?: boolean;
  flow?: boolean;
}): ReactElement {
  return (
    <View testID="mobile-protocol-content" style={styles.protocols}>
      <Text
        accessibilityRole="header"
        style={[styles.protocolTitle, compact && styles.protocolTitleCompact]}
      >
        {protocolIntro.titleLines.join("\n")}
      </Text>
      <Text style={[styles.protocolIntro, compact && styles.protocolIntroCompact]}>
        {protocolIntro.description}
      </Text>
      <View style={[styles.features, compact && styles.featuresCompact]}>
        {primitives.map((primitive) => (
          <View
            key={primitive.number}
            style={[styles.feature, flow && styles.featureFlow]}
            testID={`mobile-feature-${primitive.number}`}
          >
            <View style={styles.featureMeta}>
              <Text style={styles.featureNumber}>{primitive.number}</Text>
              <Text style={styles.badge}>{primitive.standard}</Text>
            </View>
            <Text
              accessibilityRole="header"
              style={[styles.featureTitle, compact && styles.featureTitleCompact]}
            >
              {primitive.title}
            </Text>
            <Text style={[styles.featureCopy, compact && styles.featureCopyCompact]}>
              {primitive.description}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function ConnectContent(): ReactElement {
  return (
    <View style={styles.connect} testID="mobile-connect-content">
      <Text accessibilityRole="header" style={styles.connectTitle}>
        {hero.titleLines.join("\n")}
      </Text>
      <Text style={styles.connectCopy}>{hero.description}</Text>
      <View style={styles.actions}>
        <ExternalLink href={links.github} label={hero.primaryAction}>
          <View style={styles.primary}>
            <Text style={styles.primaryText}>{hero.primaryAction}</Text>
            <Text style={styles.primaryArrow}>↗</Text>
          </View>
        </ExternalLink>
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
      <View style={styles.destinations}>
        <Text style={styles.kicker}>{aboutIntro.destinationHeading}</Text>
        {aboutDestinations.map((destination) => (
          <ExternalLink href={destination.href} label={destination.label} key={destination.number}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { paddingHorizontal: 26, alignItems: "center", width: "100%" },
  kicker: { color: "#5d6259", fontSize: 11, lineHeight: 17, letterSpacing: 0.9, marginBottom: 24 },
  originTitle: {
    color: "#1b1d19",
    fontSize: 46,
    lineHeight: 52,
    letterSpacing: -2.3,
    textAlign: "center",
    marginBottom: 26,
  },
  originTitleCompact: { fontSize: 38, lineHeight: 44 },
  accent: { color: "#6c7463" },
  originCopy: {
    color: "#50564a",
    fontSize: 18,
    lineHeight: 29,
    textAlign: "center",
    maxWidth: 520,
  },
  originCopyCompact: { fontSize: 16, lineHeight: 26 },
  signature: { color: "#5d6259", fontSize: 11, lineHeight: 19, marginTop: 26, textAlign: "center" },
  protocols: { paddingHorizontal: 22, width: "100%", maxWidth: 720, alignSelf: "center" },
  protocolTitle: {
    color: "#1b1d19",
    fontSize: 34,
    lineHeight: 39,
    letterSpacing: -1.5,
    marginBottom: 18,
  },
  protocolTitleCompact: { fontSize: 28, lineHeight: 33, marginBottom: 12 },
  protocolIntro: { color: "#5d6259", fontSize: 15, lineHeight: 24, marginBottom: 30 },
  protocolIntroCompact: { fontSize: 14, lineHeight: 22, marginBottom: 22 },
  features: { flexDirection: "row", flexWrap: "wrap", columnGap: 20, rowGap: 26 },
  featuresCompact: { columnGap: 16, rowGap: 22 },
  feature: {
    width: "46%",
    flexGrow: 1,
    borderTopWidth: 1,
    borderTopColor: "#c8cec0",
    paddingTop: 16,
  },
  featureFlow: { width: "100%", marginBottom: 6 },
  featureMeta: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  featureNumber: { color: "#535b4c", fontSize: 11 },
  badge: {
    color: "#535b4c",
    backgroundColor: "#eef0e9",
    borderWidth: 1,
    borderColor: "#d6dccf",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    fontSize: 11,
    lineHeight: 16,
  },
  featureTitle: {
    color: "#1b1d19",
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.8,
    marginBottom: 10,
  },
  featureTitleCompact: { fontSize: 22, lineHeight: 27, marginBottom: 8 },
  featureCopy: { color: "#5d6259", fontSize: 14, lineHeight: 22 },
  featureCopyCompact: { fontSize: 13, lineHeight: 20 },
  connect: {
    paddingHorizontal: 26,
    paddingTop: 44,
    paddingBottom: 44,
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    backgroundColor: "#fafaf8",
  },
  connectTitle: {
    color: "#1b1d19",
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -1.7,
    marginBottom: 24,
  },
  connectCopy: { color: "#5d6259", fontSize: 16, lineHeight: 27 },
  actions: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 20, marginTop: 26 },
  primary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    backgroundColor: "#1b1d19",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingVertical: 14,
  },
  primaryText: { color: "#ffffff", fontSize: 14, lineHeight: 22, fontWeight: "600" },
  primaryArrow: { color: "#ffffff", fontSize: 21 },
  standards: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 22,
    rowGap: 16,
    borderTopWidth: 1,
    borderTopColor: "#dcded6",
    marginTop: 34,
    paddingTop: 22,
  },
  standard: { gap: 8, paddingVertical: 8 },
  standardTitle: { color: "#525c48", fontSize: 16, fontWeight: "600", letterSpacing: -0.4 },
  standardDetail: { color: "#525c48", fontSize: 11, lineHeight: 17 },
  destinations: { marginTop: 46 },
  destination: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: "#dcded6",
    paddingVertical: 25,
  },
  destinationNumber: { color: "#5d6259", fontSize: 11 },
  destinationCopy: { flex: 1, gap: 8 },
  destinationTitle: { color: "#1b1d19", fontSize: 21, lineHeight: 28, letterSpacing: -0.5 },
  destinationDetail: { color: "#5d6259", fontSize: 13, lineHeight: 21 },
  destinationArrow: { color: "#657459", fontSize: 22 },
});
