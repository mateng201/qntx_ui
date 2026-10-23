export const links = {
  website: "https://qntx.org/",
  github: "https://github.com/qntx",
  docs: "https://qntx.org/developers",
  social: "https://x.com/qntxorg",
  products: "https://qntx.org/products",
} as const;

export const sections = [
  { id: "overview", label: "Overview", number: "01", theme: "light" },
  { id: "protocols", label: "Protocols", number: "02", theme: "light" },
  { id: "about", label: "About", number: "03", theme: "dark" },
] as const;

export type SectionId = (typeof sections)[number]["id"];

export const hero = {
  titleLines: ["The economic layer", "for autonomous agents."],
  description:
    "Open protocols and infrastructure for AI agents to transact, collaborate, govern, and evolve autonomously on-chain.",
  primaryAction: "Start exploring",
  secondaryAction: "Built in public",
} as const;

export const standards = [
  { label: "x402", detail: "payments", href: "https://github.com/qntx/r402" },
  { label: "ERC–8004", detail: "identity", href: "https://github.com/qntx/erc8004" },
  { label: "ERC–8183", detail: "commerce", href: "https://github.com/qntx/erc8183" },
] as const;

export const protocolIntro = {
  titleLines: ["Small primitives.", "An open economy."],
  description:
    "Payments, identity, commerce, and wallets. A practical foundation for software that can act on its own.",
  action: "Explore the ecosystem",
} as const;

export const aboutIntro = {
  titleLines: ["Code is law.", "We write both."],
  description: "An open-source organization building the economic layer for autonomous AI agents.",
  action: "Visit qntx.org",
  signatureLines: ["Independent agents.", "Shared possibilities."],
  destinationHeading: "THE NEXT CHAPTER STARTS WITH YOU.",
} as const;

export const aboutDestinations = [
  {
    number: "01",
    label: "Explore the organization",
    detail: "github.com/qntx",
    href: links.github,
  },
  {
    number: "02",
    label: "Read the documentation",
    detail: "qntx.org/developers",
    href: links.docs,
  },
  { number: "03", label: "Follow the work", detail: "@qntxorg on X", href: links.social },
] as const;

/** Shared geometry; HTML SVG and react-native-svg render it independently. */
export const brandMarkPath =
  "M-67.7647 -135.5294L67.7647 -135.5294A67.7647 67.7647 0 0 1 135.5294 -67.7647L135.5294 67.7647A67.7647 67.7647 0 0 0 67.7647 135.5294L-67.7647 135.5294A67.7647 67.7647 0 0 1 -135.5294 67.7647L-135.5294 -67.7647A67.7647 67.7647 0 0 1 -67.7647 -135.5294ZM-45.1765 -45.1765L45.1765 -45.1765L45.1765 45.1765L-45.1765 45.1765Z";

export const primitives = [
  {
    number: "01",
    title: "Payments",
    standard: "x402",
    description: "A payment protocol for the machine economy. An open Rust SDK for x402.",
    href: "https://github.com/qntx/r402",
  },
  {
    number: "02",
    title: "Identity",
    standard: "ERC–8004",
    description: "An on-chain execution registry. Give autonomous agents a verifiable identity.",
    href: "https://github.com/qntx/erc8004",
  },
  {
    number: "03",
    title: "Commerce",
    standard: "ERC–8183",
    description: "The building blocks for agentic commerce, available as an open Rust SDK.",
    href: "https://github.com/qntx/erc8183",
  },
  {
    number: "04",
    title: "Wallets",
    standard: "TypeScript",
    description: "A self-custodial wallet SDK. Build with keys and accounts you control.",
    href: "https://github.com/qntx/wallet",
  },
] as const;

export const repositories = [
  {
    name: "r402",
    description: "The x402 payment protocol, in Rust.",
    language: "Rust",
    href: "https://github.com/qntx/r402",
  },
  {
    name: "wallet",
    description: "Self-custodial wallets for TypeScript.",
    language: "TypeScript",
    href: "https://github.com/qntx/wallet",
  },
  {
    name: "erc8004",
    description: "An on-chain registry for AI agents.",
    language: "Rust",
    href: "https://github.com/qntx/erc8004",
  },
  {
    name: "oxc",
    description: "Shared Oxlint and Oxfmt configuration.",
    language: "TypeScript",
    href: "https://github.com/qntx/oxc",
  },
] as const;
