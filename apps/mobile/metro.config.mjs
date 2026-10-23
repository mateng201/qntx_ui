import { getDefaultConfig } from "expo/metro-config";

// Expo detects npm workspaces; no hard-coded Metro aliases or duplicate React mappings.
const config = getDefaultConfig(import.meta.dirname);
config.maxWorkers = 2;

export default config;
