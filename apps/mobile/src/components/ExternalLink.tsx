import { palette } from "@qntx-ui/design-tokens";
import type { ReactElement, ReactNode } from "react";
import { Alert, Linking, Pressable, StyleSheet, Text } from "react-native";

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
}: {
  href: string;
  label: string;
  children?: ReactNode;
}): ReactElement {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      accessibilityHint="Opens in your browser"
      onPress={() => {
        void openExternal(href);
      }}
      style={({ pressed }) => [
        styles.link,
        pressed && { backgroundColor: palette.hover, opacity: 0.85 },
      ]}
    >
      {children ?? (
        <Text style={[styles.label, { color: palette.ink }]}>
          {label} <Text accessibilityElementsHidden>↗</Text>
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: { minHeight: 44, justifyContent: "center", borderRadius: 6 },
  label: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
});
