export const links = {
  website: "https://qntx.org/",
  github: "https://github.com/qntx",
  docs: "https://qntx.org/developers",
  social: "https://x.com/qntxorg",
  products: "https://qntx.org/products",
} as const;

export const hero = {
  titleLines: ["Explore the work.", "Build what's next."],
  description:
    "Open protocols and infrastructure for AI agents to transact, collaborate, govern, and evolve autonomously on-chain.",
  primaryAction: "Start exploring",
  secondaryAction: "Built in public",
} as const;

export const homePageCopy = {
  mission: "Building open protocols and sovereign infrastructure for autonomous AI agents.",
  missionLead: "Building open protocols and sovereign",
  missionAccent: "infrastructure for autonomous AI agents.",
  missionDetail: "To transact, coordinate, and govern on-chain.",
  valueProposition: "Read the code. Share your ideas.",
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
  description: "",
  action: "Visit qntx.org",
  signatureLines: ["Independent agents.", "Shared possibilities."],
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

/** Shared GitHub icon geometry; rendered separately on each platform. */
export const githubIconPath =
  "M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.07c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.7-1.48-2.47-.28-5.06-1.24-5.06-5.49 0-1.21.44-2.2 1.14-2.97-.11-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.13a10.6 10.6 0 0 1 5.55 0c2.12-1.43 3.05-1.13 3.05-1.13.61 1.53.22 2.66.11 2.94.71.77 1.14 1.76 1.14 2.97 0 4.26-2.59 5.2-5.07 5.48.4.35.75 1.02.75 2.06v3.04c0 .3.2.65.76.54A11.1 11.1 0 0 0 12 .9Z";
