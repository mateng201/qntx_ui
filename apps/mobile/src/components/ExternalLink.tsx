import { githubIconPath } from "@qntx-ui/content";
import { fontFamilies, palette } from "@qntx-ui/design-tokens";
import type { ReactElement, ReactNode } from "react";
import { useState } from "react";
import { Alert, Linking, Platform, Pressable, StyleSheet, Text } from "react-native";
import Svg, { Path } from "react-native-svg";

async function openExternal(href: string): Promise<void> {
  try {
    await Linking.openURL(href);
  } catch {
    Alert.alert("Unable to open this link", "Please try again in your browser.");
  }
}

export function ExternalLink({
  href,
  label,
  children,
  arrowFirst = false,
  icon,
}: {
  href: string;
  label: string;
  children?: ReactNode;
  arrowFirst?: boolean;
  icon?: "github";
}): ReactElement {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Opens in your browser"
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={() => {
        void openExternal(href);
      }}
      style={({ pressed }) => [
        styles.link,
        icon !== undefined && styles.iconLink,
        (pressed || hovered) && { backgroundColor: palette.hover, opacity: 0.85 },
      ]}
    >
      {icon === "github" && (
        <Svg width={16} height={16} viewBox="0 0 24 24" aria-hidden>
          <Path d={githubIconPath} fill={palette.ink} />
        </Svg>
      )}
      {children ?? (
        <Text style={[styles.label, { color: palette.ink }]}>
          {arrowFirst && <Text aria-hidden>↗ </Text>}
          {label}
          {!arrowFirst && icon === undefined && <Text aria-hidden> ↗</Text>}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: "center", borderRadius: 6 },
  iconLink: { flexDirection: "row", alignItems: "center", gap: 6 },
  label: {
    fontFamily:
      Platform.OS === "web"
        ? fontFamilies.web
        : Platform.OS === "ios"
          ? fontFamilies.ios
          : fontFamilies.android,
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
});
